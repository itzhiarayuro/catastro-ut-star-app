import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { BigQuery } from "@google-cloud/bigquery";
import { isGlobalFichaEditor } from "./accessPolicy";

const bq = new BigQuery({ projectId: "catastro-ut-star" });

const DATASET = "firebase_export_ut_star";
const TABLE_FICHAS = `catastro-ut-star.${DATASET}.fichas_raw_raw_latest`;
const TABLE_MARCACIONES = `catastro-ut-star.${DATASET}.marcaciones_raw_raw_latest`;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verificar token Firebase y devolver uid + email
// ─────────────────────────────────────────────────────────────────────────────
async function verifyToken(req: functions.https.Request): Promise<{ uid: string; email: string } | null> {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        return { uid: decoded.uid, email: decoded.email || "" };
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: cabeceras CORS
// ─────────────────────────────────────────────────────────────────────────────
function setCors(req: functions.https.Request, res: functions.Response) {
    const allowed = ["https://catastro-ut-star.web.app", "https://catastro-ut-star.firebaseapp.com", "http://localhost:5173"];
    const origin = req.headers.origin || "";
    if (allowed.includes(origin)) res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA 1: Pozos (fichas_raw → todos los campos de la cámara)
// ─────────────────────────────────────────────────────────────────────────────
export const bqGetPozos = functions.runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onRequest(async (req, res) => {
        setCors(req, res);
        if (req.method === "OPTIONS") { res.status(204).send(""); return; }

        const user = await verifyToken(req);
        if (!user) { res.status(401).json({ error: "No autorizado" }); return; }

        const municipio = (req.query.municipio as string || "").toUpperCase().trim();
        const search    = (req.query.search as string || "").toUpperCase().trim();
        const sistema   = (req.query.sistema as string || "").toUpperCase().trim();
        const estado    = (req.query.estado as string || "").toUpperCase().trim();

        // Filtro opcional de municipio (solo admin ve todo)
        const isAdmin = isGlobalFichaEditor(user.email);

        try {
            const conditions: string[] = ["TRUE"];
            const params: Record<string, string> = {};

            if (!isAdmin) {
                conditions.push("Levanto_Email = @email");
                params["email"] = user.email.toUpperCase();
            }
            if (municipio) { conditions.push("Municipio = @municipio"); params["municipio"] = municipio; }
            if (sistema)   { conditions.push("Sistema = @sistema");     params["sistema"]   = sistema; }
            if (estado)    { conditions.push("Estado = @estado");       params["estado"]    = estado; }
            if (search) {
                conditions.push("(Idpozo LIKE @search OR Direccion LIKE @search OR Barrio LIKE @search)");
                params["search"] = `%${search}%`;
            }

            const where = conditions.join(" AND ");

            const sqlQuery = `
                WITH raw_data AS (
                    SELECT JSON_QUERY(data, '$') AS j
                    FROM \`${TABLE_FICHAS}\`
                ),
                normalized AS (
                    SELECT
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(j, '$.pozo'), NFD), r'\\pM', ''))        AS Idpozo,
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(j, '$.municipio'), NFD), r'\\pM', ''))   AS Municipio,
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(j, '$.direccion'), NFD), r'\\pM', ''))   AS Direccion,
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(j, '$.barrio'), NFD), r'\\pM', ''))      AS Barrio,
                        JSON_VALUE(j, '$.fecha')                                                            AS Fecha,
                        UPPER(JSON_VALUE(j, '$.creatorDisplayName'))                                        AS Levanto,
                        UPPER(JSON_VALUE(j, '$.creatorEmail'))                                              AS Levanto_Email,
                        UPPER(JSON_VALUE(j, '$.estadoPozo'))                                                AS Estado,
                        UPPER(JSON_VALUE(j, '$.sistema'))                                                   AS Sistema,
                        SAFE_CAST(JSON_VALUE(j, '$.gps.lat') AS FLOAT64)                                   AS Latitud,
                        SAFE_CAST(JSON_VALUE(j, '$.gps.lng') AS FLOAT64)                                   AS Longitud,
                        SAFE_CAST(JSON_VALUE(j, '$.coordenada_x') AS FLOAT64)                              AS Coordenada_X,
                        SAFE_CAST(JSON_VALUE(j, '$.coordenada_y') AS FLOAT64)                              AS Coordenada_Y,
                        SAFE_CAST(JSON_VALUE(j, '$.zRasante') AS FLOAT64)                                  AS Elevacion,
                        SAFE_CAST(JSON_VALUE(j, '$.altura') AS FLOAT64)                                    AS Profundidad,
                        UPPER(JSON_VALUE(j, '$.camara'))                                                    AS Tipo_Camara,
                        UPPER(JSON_VALUE(j, '$.rasante'))                                                   AS Rasante,
                        UPPER(JSON_VALUE(j, '$.tapa.existe'))                                               AS Existe_Tapa,
                        IF(UPPER(JSON_VALUE(j, '$.tapa.existe'))='SI',UPPER(JSON_VALUE(j,'$.tapa.mat')),'DESCONOCIDO')      AS Material_Tapa,
                        IF(UPPER(JSON_VALUE(j, '$.tapa.existe'))='SI',UPPER(JSON_VALUE(j,'$.tapa.estado')),'DESCONOCIDO')   AS Estado_Tapa,
                        UPPER(JSON_VALUE(j, '$.cono.existe'))                                               AS Existe_Cono,
                        IF(UPPER(JSON_VALUE(j, '$.cono.existe'))='SI',UPPER(JSON_VALUE(j,'$.cono.tipo')),'DESCONOCIDO')     AS Tipo_Cono,
                        IF(UPPER(JSON_VALUE(j, '$.cono.existe'))='SI',UPPER(JSON_VALUE(j,'$.cono.mat')),'DESCONOCIDO')      AS Material_Cono,
                        IF(UPPER(JSON_VALUE(j, '$.cono.existe'))='SI',UPPER(JSON_VALUE(j,'$.cono.estado')),'DESCONOCIDO')   AS Estado_Cono,
                        UPPER(JSON_VALUE(j, '$.cuerpo.existe'))                                             AS Existe_Cilindro,
                        SAFE_CAST(JSON_VALUE(j, '$.diam') AS FLOAT64)                                      AS Diametro_Cilindro_m,
                        IF(UPPER(JSON_VALUE(j,'$.cuerpo.existe'))='SI',UPPER(JSON_VALUE(j,'$.cuerpo.mat')),'DESCONOCIDO')   AS Material_Cilindro,
                        IF(UPPER(JSON_VALUE(j,'$.cuerpo.existe'))='SI',UPPER(JSON_VALUE(j,'$.cuerpo.estado')),'DESCONOCIDO') AS Estado_Cilindro,
                        UPPER(JSON_VALUE(j, '$.canu.existe'))                                               AS Existe_Canuela,
                        IF(UPPER(JSON_VALUE(j,'$.canu.existe'))='SI',UPPER(JSON_VALUE(j,'$.canu.mat')),'DESCONOCIDO')       AS Material_Canuela,
                        IF(UPPER(JSON_VALUE(j,'$.canu.existe'))='SI',UPPER(JSON_VALUE(j,'$.canu.estado')),'DESCONOCIDO')    AS Estado_Canuela,
                        UPPER(JSON_VALUE(j, '$.peld.existe'))                                               AS Existe_Peldanos,
                        IF(UPPER(JSON_VALUE(j,'$.peld.existe'))='SI',UPPER(JSON_VALUE(j,'$.peld.mat')),'DESCONOCIDO')       AS Material_Peldanos,
                        IF(UPPER(JSON_VALUE(j,'$.peld.existe'))='SI',SAFE_CAST(JSON_VALUE(j,'$.peld.num') AS INT64),0)      AS Numero_Peldanos,
                        IF(UPPER(JSON_VALUE(j,'$.peld.existe'))='SI',UPPER(JSON_VALUE(j,'$.peld.estado')),'DESCONOCIDO')    AS Estado_Peldanos,
                        UPPER(JSON_VALUE(j, '$.cargue.existe'))                                             AS Existe_Cargue,
                        IF(UPPER(JSON_VALUE(j,'$.cargue.existe'))='SI',UPPER(JSON_VALUE(j,'$.cargue.mat')),'DESCONOCIDO')   AS Material_Cargue,
                        IF(UPPER(JSON_VALUE(j,'$.cargue.existe'))='SI',UPPER(JSON_VALUE(j,'$.cargue.estado')),'DESCONOCIDO') AS Estado_Cargue,
                        UPPER(JSON_VALUE(j, '$.obs'))                                                       AS Observaciones,
                        j AS rawData
                    FROM raw_data
                )
                SELECT * FROM normalized
                WHERE ${where}
                ORDER BY Municipio, Idpozo
            `;

            const [rows] = await bq.query({ query: sqlQuery, params, location: "US" });

            // Stats rápido
            const stats = {
                total: rows.length,
                municipios: [...new Set((rows as any[]).map((r: any) => r.Municipio).filter(Boolean))],
                sistemas: [...new Set((rows as any[]).map((r: any) => r.Sistema).filter(Boolean))],
            };

            res.status(200).json({ ok: true, data: rows, stats, source: "bigquery" });
        } catch (err: any) {
            console.error("[bqGetPozos] Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// VISTA 2: Marcaciones
// ─────────────────────────────────────────────────────────────────────────────
export const bqGetMarcaciones = functions.runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onRequest(async (req, res) => {
        setCors(req, res);
        if (req.method === "OPTIONS") { res.status(204).send(""); return; }

        const user = await verifyToken(req);
        if (!user) { res.status(401).json({ error: "No autorizado" }); return; }

        const municipio = (req.query.municipio as string || "").toUpperCase().trim();
        const search    = (req.query.search as string || "").toUpperCase().trim();
        const tipo      = (req.query.tipo as string || "").toUpperCase().trim();

        const isAdmin = isGlobalFichaEditor(user.email);

        try {
            const conditions: string[] = ["TRUE"];
            const params: Record<string, string> = {};

            if (!isAdmin) {
                conditions.push("UPPER(Levanto_Email) = @email");
                params["email"] = user.email.toUpperCase();
            }
            if (municipio) { conditions.push("Municipio = @municipio"); params["municipio"] = municipio; }
            if (tipo)      { conditions.push("Tipo_de_elemento = @tipo"); params["tipo"] = tipo; }
            if (search) {
                conditions.push("(Id_pozo_sumidero LIKE @search OR Municipio LIKE @search)");
                params["search"] = `%${search}%`;
            }

            const where = conditions.join(" AND ");

            const sqlQuery = `
                WITH base AS (
                    SELECT DISTINCT
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.codigo'), NFD), r'\\pM', ''))      AS Id_pozo_sumidero,
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.municipio'), NFD), r'\\pM', ''))   AS Municipio,
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.tipoElemento'), NFD), r'\\pM', '')) AS Tipo_de_elemento,
                        UPPER(COALESCE(JSON_VALUE(data, '$.creatorEmail'), JSON_VALUE(data, '$.inspector')))  AS Levanto_Email,
                        SAFE_CAST(JSON_VALUE(data, '$.gps.lat') AS FLOAT64)                                   AS Latitud,
                        SAFE_CAST(JSON_VALUE(data, '$.gps.lng') AS FLOAT64)                                   AS Longitud,
                        SAFE_CAST(JSON_VALUE(data, '$.coordenada_x') AS FLOAT64)                              AS Coordenada_X,
                        SAFE_CAST(JSON_VALUE(data, '$.coordenada_y') AS FLOAT64)                              AS Coordenada_Y,
                        COALESCE(UPPER(JSON_VALUE(data, '$.obs')), 'NO INDICA')                               AS Observaciones,
                        SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', JSON_VALUE(data, '$.lastSync'))          AS Fecha_de_registro,
                        CASE 
                            WHEN JSON_VALUE(data, '$.codigo') LIKE '%PZ%' THEN 'PZ'
                            WHEN JSON_VALUE(data, '$.codigo') LIKE '%PL%' THEN 'PL'
                            WHEN JSON_VALUE(data, '$.codigo') LIKE '%S%'  THEN 'S'
                            ELSE 'OTRO'
                        END AS id_pz_s,
                        SAFE_CAST(REGEXP_REPLACE(JSON_VALUE(data, '$.codigo'), r'[^0-9]', '') AS INT64) AS num_pozo
                    FROM \`${TABLE_MARCACIONES}\`
                )
                SELECT * FROM base
                WHERE ${where}
                ORDER BY Municipio, Id_pozo_sumidero
            `;

            const [rows] = await bq.query({ query: sqlQuery, params, location: "US" });
            const stats = {
                total: rows.length,
                municipios: [...new Set((rows as any[]).map((r: any) => r.Municipio).filter(Boolean))],
                tipos: [...new Set((rows as any[]).map((r: any) => r.Tipo_de_elemento).filter(Boolean))],
            };

            res.status(200).json({ ok: true, data: rows, stats, source: "bigquery" });
        } catch (err: any) {
            console.error("[bqGetMarcaciones] Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// VISTA 3: Tuberías (UNNEST de pipes en fichas)
// ─────────────────────────────────────────────────────────────────────────────
export const bqGetTuberias = functions.runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onRequest(async (req, res) => {
        setCors(req, res);
        if (req.method === "OPTIONS") { res.status(204).send(""); return; }

        const user = await verifyToken(req);
        if (!user) { res.status(401).json({ error: "No autorizado" }); return; }

        const municipio = (req.query.municipio as string || "").toUpperCase().trim();
        const search    = (req.query.search as string || "").toUpperCase().trim();

        const isAdmin = isGlobalFichaEditor(user.email);

        try {
            const conditions: string[] = [`UPPER(JSON_VALUE(data, '$.municipio')) <> 'MARINILLA'`];
            const params: Record<string, string> = {};

            if (!isAdmin) {
                conditions.push("UPPER(JSON_VALUE(data, '$.creatorEmail')) = @email");
                params["email"] = user.email.toUpperCase();
            }
            if (municipio) {
                conditions.push("UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.municipio'), NFD), r'\\pM', '')) = @municipio");
                params["municipio"] = municipio;
            }

            const outerConditions: string[] = ["TRUE"];
            if (search) {
                outerConditions.push("(Id_pozo LIKE @search OR Id_tuberia LIKE @search)");
                params["search"] = `%${search}%`;
            }

            const where = conditions.join(" AND ");
            const outerWhere = outerConditions.join(" AND ");

            const sqlQuery = `
                WITH base AS (
                    SELECT
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.pozo'), NFD), r'\\pM', ''))      AS Id_pozo,
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.municipio'), NFD), r'\\pM', '')) AS Municipio,
                        UPPER(JSON_VALUE(p, '$.deA'))                                                       AS Id_tuberia,
                        UPPER(JSON_VALUE(p, '$.es'))                                                        AS Tipo_Tuberia,
                        SAFE_CAST(JSON_VALUE(p, '$.orden') AS INT64)                                        AS Orden,
                        SAFE_CAST(JSON_VALUE(p, '$.diam') AS FLOAT64)                                       AS Diam_mm,
                        UPPER(JSON_VALUE(p, '$.mat'))                                                       AS Material,
                        SAFE_CAST(JSON_VALUE(p, '$.cotaZ') AS FLOAT64)                                     AS Z,
                        UPPER(JSON_VALUE(p, '$.estado'))                                                    AS Estado,
                        CASE 
                            WHEN JSON_VALUE(p, '$.emboq') = 'true' OR UPPER(JSON_VALUE(p, '$.emboq')) = 'SI' THEN 'SI'
                            ELSE 'NO' 
                        END AS Emboquillado,
                        CASE WHEN UPPER(JSON_VALUE(p,'$.es'))='ENTRADA' THEN UPPER(JSON_VALUE(p,'$.deA')) ELSE UPPER(JSON_VALUE(data,'$.pozo')) END AS From_Node,
                        CASE WHEN UPPER(JSON_VALUE(p,'$.es'))='ENTRADA' THEN UPPER(JSON_VALUE(data,'$.pozo')) ELSE UPPER(JSON_VALUE(p,'$.deA')) END AS To_Node,
                        CONCAT(
                            CASE WHEN UPPER(JSON_VALUE(p,'$.es'))='ENTRADA' THEN UPPER(JSON_VALUE(p,'$.deA')) ELSE UPPER(JSON_VALUE(data,'$.pozo')) END,
                            '_',
                            CASE WHEN UPPER(JSON_VALUE(p,'$.es'))='ENTRADA' THEN UPPER(JSON_VALUE(data,'$.pozo')) ELSE UPPER(JSON_VALUE(p,'$.deA')) END
                        ) AS ID_PIPE
                    FROM \`${TABLE_FICHAS}\`,
                    UNNEST(JSON_QUERY_ARRAY(data, '$.pipes')) AS p
                    WHERE ${where}
                )
                SELECT * FROM base
                WHERE ${outerWhere}
                ORDER BY Municipio, Id_pozo, Orden
            `;

            const [rows] = await bq.query({ query: sqlQuery, params, location: "US" });
            const stats = {
                total: rows.length,
                municipios: [...new Set((rows as any[]).map((r: any) => r.Municipio).filter(Boolean))],
            };

            res.status(200).json({ ok: true, data: rows, stats, source: "bigquery" });
        } catch (err: any) {
            console.error("[bqGetTuberias] Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

// ─────────────────────────────────────────────────────────────────────────────
// VISTA 4: Sumideros (UNNEST de sums en fichas) – estructura similar a pipes
// ─────────────────────────────────────────────────────────────────────────────
export const bqGetSumideros = functions.runWith({ timeoutSeconds: 30, memory: "256MB" })
    .https.onRequest(async (req, res) => {
        setCors(req, res);
        if (req.method === "OPTIONS") { res.status(204).send(""); return; }

        const user = await verifyToken(req);
        if (!user) { res.status(401).json({ error: "No autorizado" }); return; }

        const municipio = (req.query.municipio as string || "").toUpperCase().trim();
        const search    = (req.query.search as string || "").toUpperCase().trim();

        const isAdmin = isGlobalFichaEditor(user.email);

        try {
            const conditions: string[] = ["TRUE"];
            const params: Record<string, string> = {};

            if (!isAdmin) {
                conditions.push("UPPER(JSON_VALUE(data, '$.creatorEmail')) = @email");
                params["email"] = user.email.toUpperCase();
            }
            if (municipio) {
                conditions.push("UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.municipio'), NFD), r'\\pM', '')) = @municipio");
                params["municipio"] = municipio;
            }

            const outerConditions: string[] = ["TRUE"];
            if (search) {
                outerConditions.push("(Id_pozo LIKE @search OR Id_sumidero LIKE @search)");
                params["search"] = `%${search}%`;
            }

            const where = conditions.join(" AND ");
            const outerWhere = outerConditions.join(" AND ");

            const sqlQuery = `
                WITH base AS (
                    SELECT
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.pozo'), NFD), r'\\pM', ''))      AS Id_pozo,
                        UPPER(REGEXP_REPLACE(NORMALIZE(JSON_VALUE(data, '$.municipio'), NFD), r'\\pM', '')) AS Municipio,
                        UPPER(JSON_VALUE(s, '$.deA'))                                                       AS Id_sumidero,
                        UPPER(JSON_VALUE(s, '$.es'))                                                        AS Tipo,
                        SAFE_CAST(JSON_VALUE(s, '$.orden') AS INT64)                                        AS Orden,
                        SAFE_CAST(JSON_VALUE(s, '$.diam') AS FLOAT64)                                       AS Diam_mm,
                        UPPER(JSON_VALUE(s, '$.mat'))                                                       AS Material,
                        SAFE_CAST(JSON_VALUE(s, '$.cotaZ') AS FLOAT64)                                     AS Z,
                        UPPER(JSON_VALUE(s, '$.estado'))                                                    AS Estado
                    FROM \`${TABLE_FICHAS}\`,
                    UNNEST(JSON_QUERY_ARRAY(data, '$.sums')) AS s
                    WHERE ${where}
                )
                SELECT * FROM base
                WHERE ${outerWhere}
                ORDER BY Municipio, Id_pozo, Orden
            `;

            const [rows] = await bq.query({ query: sqlQuery, params, location: "US" });
            const stats = {
                total: rows.length,
                municipios: [...new Set((rows as any[]).map((r: any) => r.Municipio).filter(Boolean))],
            };

            res.status(200).json({ ok: true, data: rows, stats, source: "bigquery" });
        } catch (err: any) {
            console.error("[bqGetSumideros] Error:", err);
            res.status(500).json({ error: err.message });
        }
    });
