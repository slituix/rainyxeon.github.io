const command = {
  name: "AUDIO",
  desc: "Enable or disable audio",
  usage: "AUDIO [ENABLE or DISABLE]",

  run: (e, commandList) => {
    const accept = ["ENABLE", "DISABLE"];
    const [, arg] = e.target.value.split(" ");
    if (!accept.includes(arg))
      return (document.getElementById("term_screen").innerHTML +=
        `<div>Invalid arg, please use ENABLE and DISABLE only</div>`);
    switch (arg) {
      case "ENABLE":
        localStorage.setItem("/settings/audio/beep", "yes");
        new Audio("assets/audio/beep.mp3").play();
        break;
      case "DISABLE":
        localStorage.setItem("/settings/audio/beep", "no");
        break;
    }
  },

  template: (data, padding) => {
    if (!data && data == null)
      return `<div style="display: block; height: 20px;"></div>`;
    return `<div style="${padding ? `padding-left: ${padding}px` : ""}">${data}</div>`;
  },
};

export default command;
