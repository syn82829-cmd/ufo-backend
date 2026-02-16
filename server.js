const express = require("express"); 
const app = express(); 

app.get("/", (req, res) => {   
res.send("UFO backend works 🚀"); 
});  

const PORT = 3000
; app.listen(PORT, () => {   
console.log("Server started on port " + PORT); 
});
