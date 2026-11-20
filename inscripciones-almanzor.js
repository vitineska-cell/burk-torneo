// Lector del libro definitivo. Solo salen del navegador los nombres que
// la mesa decida publicar con Guardar y publicar.
function rosterFromExcel(buffer) {
  const maxBytes = 8 * 1024 * 1024;
  let xmlBytes = 0;
  const entries = fflate.unzipSync(new Uint8Array(buffer), {
    filter(entry) {
      if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(entry.name)) return false;
      xmlBytes += entry.originalSize;
      if (xmlBytes > maxBytes) throw Error("El Excel de parejas supera el tamaño admitido.");
      return true;
    }
  });
  function xml(path) {
    if (!entries[path]) throw Error("Falta una hoja o una referencia del libro de Excel.");
    const document = new DOMParser().parseFromString(fflate.strFromU8(entries[path]), "application/xml");
    if (document.getElementsByTagName("parsererror").length) throw Error("El Excel contiene XML ilegible.");
    return document;
  }
  const elements = (node, tag) => Array.from(node.getElementsByTagNameNS("*", tag));
  const textRuns = node => elements(node, "t").map(t => t.textContent).join("");
  const strings = entries["xl/sharedStrings.xml"] ? elements(xml("xl/sharedStrings.xml"), "si").map(textRuns) : [];
  const rels = new Map(elements(xml("xl/_rels/workbook.xml.rels"), "Relationship")
    .map(rel => [rel.getAttribute("Id"), rel.getAttribute("Target")]));
  const sheets = elements(xml("xl/workbook.xml"), "sheet");
  const categories = {};
  for (const name of categoryNames) {
    const sheet = sheets.find(item => item.getAttribute("name") === name);
    if (!sheet) throw Error("Falta la hoja " + name + " en el listado de parejas.");
    const relation = sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const target = rels.get(relation);
    if (!target) throw Error("No se puede leer la hoja " + name + ".");
    const path = target.startsWith("/") ? target.slice(1) : "xl/" + target;
    const rows = elements(xml(path), "row").map(row => {
      const cells = {};
      for (const cell of elements(row, "c")) {
        const col = cell.getAttribute("r")?.match(/^[A-Z]+/)?.[0];
        const value = elements(cell, "v")[0]?.textContent || "";
        const type = cell.getAttribute("t");
        cells[col] = type === "s" ? strings[Number(value)] : type === "inlineStr" ? textRuns(cell) : value;
      }
      return cells;
    }).filter(row => Object.values(row).some(Boolean));
    const columns = Object.fromEntries(Object.entries(rows.shift() || {}).map(([col, header]) => [header, col]));
    const headers = ["Pareja", "Nombre jugador 1", "Apellidos jugador 1", "Nombre jugador 2", "Apellidos jugador 2"];
    if (!headers.every(header => columns[header])) throw Error("Revisa los encabezados de la hoja " + name + ".");
    categories[name] = rows.map((row, i) => {
      const fields = headers.map(header => (row[columns[header]] || "").trim());
      if (fields.some(value => !value)) throw Error("Falta un código, nombre o apellido en " + name + ", pareja " + (i+1) + ".");
      return {id:fields[0], p1:fields[1] + " " + fields[2], p2:fields[3] + " " + fields[4]};
    });
  }
  return {eventId:EVENT_ID, categories};
}
