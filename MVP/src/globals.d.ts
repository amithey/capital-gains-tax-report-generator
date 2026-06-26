// ייבוא נכס כ-URL (webpack/Next) — משמש לטעינת ה-worker של pdf.js.
declare module "*?url" {
  const url: string;
  export default url;
}
