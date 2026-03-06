import * as fs from "fs";

export function generarDoc(contenido: string){

    if(!fs.existsSync("docs")){
        fs.mkdirSync("docs");
    }

    fs.writeFileSync("docs/cambios.md", contenido);

}