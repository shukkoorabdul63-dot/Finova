import { createContext, useContext, useState } from "react";
import { formatAmount } from "../utils/finance";

const FormatContext = createContext();

export const FORMAT_OPTIONS = [
  { id: "full",      label: "Full (₹1,23,45,678.50)" },
  { id: "lakhs",     label: "Lakhs (₹123.45L)" },
  { id: "crores",    label: "Crores (₹1.23Cr)" },
  { id: "thousands", label: "Thousands (₹1,234K)" },
  { id: "short",     label: "Short (auto L/Cr)" },
];

export function FormatProvider({ children }) {
  const [format, setFormat] = useState("lakhs");
  const fmt = (val) => formatAmount(val, format);
  const fmtShort = (val) => formatAmount(val, format === "full" ? "lakhs" : format);
  return (
    <FormatContext.Provider value={{ format, setFormat, fmt, fmtShort }}>
      {children}
    </FormatContext.Provider>
  );
}

export const useFormat = () => useContext(FormatContext);
