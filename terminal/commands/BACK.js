const command = {
  name: "BACK",
  desc: "Go back to portfolio",
  usage: null,

  run: (e, commandList) => {
    return window.open("../", "_self");
  },
};

export default command;
