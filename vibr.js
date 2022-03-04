export default class Vibr {
  constructor() {
    this.version = "1.0";
    this.hash = "674703928aeffb8e86c3b452da52382d451b1c5b5a62ac22105eb697f5b346a128c0358c98c45112fd9ff7bb428f2e86e0f46ef408ed9fe976f6278ac6931267"
  }
  parse(string) {
    if (typeof string !== 'string') {
      return null;
    }
    if (string.length === 0) {
      return null;
    }
    let arr = string.split(/\r?\n/gm);
    arr = arr.filter(item => item.trim() != "");
    if (arr.length < 2) {
      return null;
    }
    let fline = arr[0].split("%");
    if (fline.length != 3) {
      return null;
    }
    if (fline[0] != "VIBR") {
      return null;
    }
    let version = fline[1];
    let hash = fline[2];
    if (hash != this.hash) {
      return null;
    }
    let metadata = string.match(/\%metadata\%[\s\S]*\%metadata\%end\%/gmi)[0].replace(/\%metadata\%end\%/gmi, "").replace(/\%metadata\%/gmi, "").trim();
    metadata = metadata.split(/\r?\n/gm);
    let mdata = {};
    metadata.forEach(item => {
      let line = item.trim().split("->").map(i => i.trim());
      if (line.length != 2) {
        return null;
      }
      mdata[line[0]] = line[1];
    });
    let content = string.match(/\%content\%[\s\S]*\%content\%end\%/gmi)[0].replace(/\%content\%end\%/gmi, "").replace(/\%content\%/gmi, "").trim();
    let cdata = [];
    cdata = content.split(" ");
    if (cdata[0] == "" && cdata.length == 1) cdata = []
    let obj = {
      metadata: mdata,
      data: cdata.map(i => parseFloat(i))
    };
    return obj;
  }
  create(obj, returnFile) {
    if (typeof obj !== 'object' || Array.isArray(obj)) {
      return null;
    }
    if (!obj.data) {
      return null;
    }
    if (obj.metadata && typeof obj.metadata !== 'object' || Array.isArray(obj.metadata)) {
      return null;
    }
    if (!Array.isArray(obj.data)) {
      return null;
    }
    let metadata = {
      version: this.version,
      mimeType: "application/vibr",
      fileName: "Untitled VibRat",
      author: "VibRat Client",
      creationDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      signer: "VibRat Client",
      duration: 1000,
      ...obj.metadata
    };

    let data = obj.data.join(" ");
    let header = `VIBR%${this.version}%${this.hash}`;
    let metadataString = "%metadata%\n";
    Object.entries(metadata).forEach(([key, value]) => {
      metadataString += `${key}->${value}\n`;
    });
    metadataString += "%metadata%end%";
    let content = `%content%\n${data}\n%content%end%`;
    let fileContents = `${header}\n${metadataString}\n${content}`;
    if (returnFile) {
      return new File([fileContents], metadata.fileName + ".vibr", {
        type: metadata.mimeType
      });
    }
    return fileContents;
  }
  downloadFile(FileObject) {
    var element = document.createElement('a');
    let url = window.URL.createObjectURL(FileObject);
    element.setAttribute('href', url);
    element.setAttribute('download', FileObject.name);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}