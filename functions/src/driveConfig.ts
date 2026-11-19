export function normalizeDriveFolderId(value: string | undefined, fallback: string): string {
    return (value || fallback).trim();
}
