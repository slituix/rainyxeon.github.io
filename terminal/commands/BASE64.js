function decode(base64) {
  const binString = window.atob(base64);
  return new TextDecoder().decode(
    Uint8Array.from(binString, (m) => m.codePointAt(0)),
  );
}

function encode(str) {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join("");
  return window.btoa(binString);
}

const command = {
  name: "BASE64",
  desc: "Encode or decode string",
  usage: "BASE64 [ENCODE or DECODE] [string]",

  run: (e, commandList) => {
    const accept = ["ENCODE", "DECODE"];
    const [, arg] = e.target.value.split(" ");
    const input = e.target.value.split(" ").slice(2).join(" ");
    if (!accept.includes(arg))
      return (document.getElementById("term_screen").innerHTML +=
        `<div>Invalid arg, please use ENCODE and DECODE only</div>`);
    if (!input)
      return (document.getElementById("term_screen").innerHTML +=
        `<div>Missing input</div>`);
    if (arg == "ENCODE")
      return (document.getElementById("term_screen").innerHTML +=
        `<div>${encode(input)}</div>`);
    if (arg == "DECODE")
      return (document.getElementById("term_screen").innerHTML +=
        `<div>${decode(input)}</div>`);
  },
};

export default command;
