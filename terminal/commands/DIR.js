const command = {
  name: "DIR",
  desc: "List all file",
  usage: null,

  run: (e, commandList) => {
    document.getElementById("term_screen").innerHTML += "<pre>RAINY.exe</pre>";
  },
};

export default command;
