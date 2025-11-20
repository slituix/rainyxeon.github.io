const command = {
  name: "RAINY",
  desc: "List all file",
  usage: null,
  hidden: true,

  run: (e, commandList) => {
    document.getElementById("term_screen").innerHTML += `<pre>
    Hi, if you see this file and execute it then too bad for you.
    This file doesn't contain any infomation except text.
    To know more about me, please use 'info' command :)

    Peace,
    RainyXeon</pre>`;
  },
};

export default command;
