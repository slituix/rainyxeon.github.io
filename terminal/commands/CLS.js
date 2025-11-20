const command = {
  name: "CLS",
  desc: "Clear all screen (short)",
  usage: null,

  run: (e, commandList) => {
    document.getElementById("term_screen").innerHTML = "";
  },
};

export default command;
