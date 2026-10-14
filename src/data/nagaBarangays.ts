import type { Barangay } from "../types/barangay.ts";

// Official PSGC codes and names: PSA, Naga City barangays (as of 31 July 2025).
export const NAGA_CITY_CODE = "0501724000";
export const NAGA_BARANGAYS: Barangay[] = [
  ["0501724001", "Abella"], ["0501724002", "Bagumbayan Norte"], ["0501724003", "Bagumbayan Sur"],
  ["0501724004", "Balatas"], ["0501724006", "Calauag"], ["0501724007", "Cararayan"],
  ["0501724008", "Carolina"], ["0501724009", "Concepcion Grande"], ["0501724010", "Concepcion Pequeña"],
  ["0501724011", "Dayangdang"], ["0501724012", "Del Rosario"], ["0501724013", "Dinaga"],
  ["0501724014", "Igualdad Interior"], ["0501724017", "Lerma"], ["0501724018", "Liboton"],
  ["0501724019", "Mabolo"], ["0501724020", "Pacol"], ["0501724023", "Panicuason"],
  ["0501724024", "Peñafrancia"], ["0501724025", "Sabang"], ["0501724026", "San Felipe"],
  ["0501724027", "San Francisco"], ["0501724028", "San Isidro"], ["0501724029", "Santa Cruz"],
  ["0501724030", "Tabuco"], ["0501724031", "Tinago"], ["0501724032", "Triangulo"],
].map(([code, name]) => ({ code, name, city: "Naga City" }));

export const BARANGAY_BY_CODE = new Map(NAGA_BARANGAYS.map((barangay) => [barangay.code, barangay]));

if (NAGA_BARANGAYS.length !== 27 || BARANGAY_BY_CODE.size !== 27 || new Set(NAGA_BARANGAYS.map(({ name }) => name.normalize("NFC").toLocaleLowerCase())).size !== 27) {
  throw new Error("Naga City barangay registry failed its 27-entry uniqueness check.");
}
if (NAGA_BARANGAYS.some(({ code }) => !/^0501724\d{3}$/.test(code))) {
  throw new Error("Naga City barangay registry contains a code outside the official Naga PSGC prefix.");
}
