const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function test() {
    try {
        const saPath = path.resolve(__dirname, '../service-account.json');
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
        const auth = new google.auth.JWT(
            sa.client_email,
            null,
            sa.private_key,
            ["https://www.googleapis.com/auth/drive"]
        );
        const drive = google.drive({ version: 'v3', auth });

        const FOLDER_ID = "1JJFOP_OQot-n4sqfDORtJYuLQiNyoDZx";
        console.log("Checking folder access for:", sa.client_email);
        
        const response = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and trashed=false`,
            pageSize: 10
        });
        console.log("Found:", response.data.files.length);
    } catch(e) {
        console.error("ERROR:", e.message);
    }
}
test();
