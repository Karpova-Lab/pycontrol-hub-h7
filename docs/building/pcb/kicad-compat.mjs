// Translate KiCad 10 named nets to the numeric net syntax KiCanvas reads.
// This runs in memory: original files and downloads are never changed.
export function kicanvasBoard(source) {
  const tokens = source.matchAll(/"(?:\\.|[^"\\])*"|[()]|[^\s()"]+/g);
  const stack = [];
  const nets = new Map([['""', 0]]);
  const edits = [];
  let rootEnd;
  let numericNets = false;

  for (const token of tokens) {
    const value = token[0];
    if (value === "(") {
      stack.push({ start: token.index, atoms: [] });
    } else if (value === ")") {
      const node = stack.pop();
      if (!node) throw new Error("Unbalanced KiCad PCB");
      const { start, atoms } = node;
      if (atoms[0] !== "net") continue;
      if (atoms.length !== 2 || !atoms[1].startsWith('"')) {
        numericNets = true;
        continue;
      }
      const parent = stack.at(-1)?.atoms[0];
      if (!["pad", "segment", "arc", "via", "zone"].includes(parent)) {
        throw new Error(`Unsupported named net in ${parent}`);
      }
      const name = atoms[1];
      if (!nets.has(name)) nets.set(name, nets.size);
      const number = nets.get(name);
      let replacement = `(net ${number})`;
      if (parent === "pad") replacement = `(net ${number} ${name})`;
      else if (parent === "zone") replacement += `\n\t\t(net_name ${name})`;
      edits.push([start, token.index + value.length, replacement]);
    } else {
      if (!stack.length) throw new Error("Expected a KiCad PCB expression");
      stack.at(-1).atoms.push(value);
      if (stack.length === 1 && rootEnd === undefined) {
        if (value !== "kicad_pcb") throw new Error("Expected a KiCad PCB");
        rootEnd = token.index + value.length;
      }
    }
  }
  if (stack.length || rootEnd === undefined) throw new Error("Incomplete KiCad PCB");
  if (!edits.length) return source; // Earlier KiCad versions already use numeric nets.
  if (numericNets) throw new Error("Mixed named/numeric nets; review the KiCanvas conversion");

  const table = [...nets].map(([name, number]) => `\n\t(net ${number} ${name})`).join("");
  edits.push([rootEnd, rootEnd, table]);
  edits.sort((a, b) => a[0] - b[0]);
  const pieces = [];
  let previous = 0;
  for (const [start, end, replacement] of edits) {
    pieces.push(source.slice(previous, start), replacement);
    previous = end;
  }
  pieces.push(source.slice(previous));
  return pieces.join("");
}
