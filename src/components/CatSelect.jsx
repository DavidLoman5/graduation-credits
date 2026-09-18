import { CATS } from "../data/rules.js";

export default function CatSelect({ value, onChange, label, className = "" }) {
  return (
    <select className={(value === "unknown" ? "warnsel " : "") + className} value={value} onChange={onChange} aria-label={label}>
      {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}
