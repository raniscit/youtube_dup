import connectDb from "./db/index.js";
import { app } from "./app.js";

connectDb()
.then(() => {
    app.on("error", (err) => {
      console.error("App error:", err);
      process.exit(1);
    });
    app.listen(process.env.PORT || 8000 ,() => {
        console.log("Server is listening on port",process.env.PORT);
    })
})
.catch((error) => {
    console.log("Mongoddb connection failed !!",error);
})