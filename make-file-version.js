const fs = require("fs");
const path = require("path");

fs.readFile("./package.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error leyendo package.json:", err);
    return;
  }

  const packageObj = JSON.parse(data);

  if (process.argv[2] === "public") {
    fs.mkdir(path.join(__dirname, "build", "assets"), (err) => {
      if (err) {
        console.error("Error creando directorio assets:", err);
        return;
      }

      fs.writeFile(
        path.join(__dirname, "build", "assets", "version.json"),
        JSON.stringify({version: packageObj.version}),
        (err) => {
          if (err) {
            console.error("Error escribiendo en version.txt:", err);
            return;
          }

          console.log("Archivo version.txt creado con éxito.");
        }
      );
    });

    return;
  }

  fs.writeFile("version.txt", packageObj.version, (err) => {
    if (err) {
      console.error("Error escribiendo en version.txt:", err);
      return;
    }

    console.log("Archivo version.txt creado con éxito.");
  });
});
