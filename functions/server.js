import express from "express";
import serverless from "serverless-http";
import ytdl from "ytdl-core";
import cors from "cors";
import authenticateToken from './auth_middleware.js'; 

const app = express();
app.use(cors());
const router = express.Router();

// Aplicar el middleware de autenticación ANTES de las rutas que lo necesitan
router.use(['/info', '/mp3', '/mp4'], authenticateToken);

router.get("/", (req, res) => {
    const ping = new Date();
    ping.setHours(ping.getHours() - 3);
    console.log(
        `Ping at: ${ping.getUTCHours()}:${ping.getUTCMinutes()}:${ping.getUTCSeconds()}`
    );
    res.sendStatus(200);
});

router.get("/info", async (req, res) => {
    const { url } = req.query;

    if (url) {
        const isValid = ytdl.validateURL(url);

        if (isValid) {
            const info = (await ytdl.getInfo(url)).videoDetails;

            const title = info.title;
            const thumbnail = info.thumbnails[2].url;

            res.send({ title: title, thumbnail: thumbnail });
        } else {
            res.status(400).send("Invalid url");
        }
    } else {
        res.status(400).send("Invalid query");
    }
});

router.get("/mp3", async (req, res) => {
    const { url } = req.query;

    if (url) {
        const isValid = ytdl.validateURL(url);

        if (isValid) {
            const videoName = (await ytdl.getInfo(url)).videoDetails.title;

            res.header(
                "Content-Disposition",
                `attachment; filename="${videoName}.mp3"`
            );
            res.header("Content-type", "audio/mpeg3");

            ytdl(url, { quality: "highestaudio", format: "mp3" }).pipe(res);
        } else {
            res.status(400).send("Invalid url");
        }
    } else {
        res.status(400).send("Invalid query");
    }
});

router.get("/mp4", async (req, res) => {
    const { url } = req.query;

    if (url) {
        const isValid = ytdl.validateURL(url);

        if (isValid) {
            const videoName = (await ytdl.getInfo(url)).videoDetails.title;

            res.header(
                "Content-Disposition",
                `attachment; filename="${videoName}.mp4"`
            );

            ytdl(url, {
                quality: "highest",
                format: "mp4",
            }).pipe(res);
        } else {
            res.status(400).send("Invalid url");
        }
    } else {
        res.status(400).send("Invalid query");
    }
});

/* app.listen(process.env.PORT || 3500, () => {
    console.log("Server on");
}); */


app.use('/.netlify/functions/server', router);
//module.exports.handler = serverless(app);
export const handler = serverless(app);