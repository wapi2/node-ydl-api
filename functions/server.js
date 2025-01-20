import express from "express";
import serverless from "serverless-http";
import ytdl from "ytdl-core";
import cors from "cors";
import authenticateToken from './auth_middleware.js';

const app = express();
const router = express.Router();

// Configuración de middleware básico
app.use(cors());

// Ruta de ping/healthcheck (sin autenticación)
router.get("/", (req, res) => {
    const ping = new Date();
    ping.setHours(ping.getHours() - 3);
    console.log(`Ping at: ${ping.getUTCHours()}:${ping.getUTCMinutes()}:${ping.getUTCSeconds()}`);
    res.sendStatus(200);
});

// Rutas protegidas
const protectedRouter = express.Router();

protectedRouter.get("/info", async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send("Invalid query");
    }
    
    const isValid = ytdl.validateURL(url);
    if (!isValid) {
        return res.status(400).send("Invalid url");
    }

    const info = (await ytdl.getInfo(url)).videoDetails;
    const title = info.title;
    const thumbnail = info.thumbnails[2].url;
    res.send({ title, thumbnail });
});

protectedRouter.get("/mp3", async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send("Invalid query");
    }

    const isValid = ytdl.validateURL(url);
    if (!isValid) {
        return res.status(400).send("Invalid url");
    }

    const videoName = (await ytdl.getInfo(url)).videoDetails.title;
    res.header("Content-Disposition", `attachment; filename="${videoName}.mp3"`);
    res.header("Content-type", "audio/mpeg3");
    ytdl(url, { quality: "highestaudio", format: "mp3" }).pipe(res);
});

protectedRouter.get("/mp4", async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send("Invalid query");
    }

    const isValid = ytdl.validateURL(url);
    if (!isValid) {
        return res.status(400).send("Invalid url");
    }

    const videoName = (await ytdl.getInfo(url)).videoDetails.title;
    res.header("Content-Disposition", `attachment; filename="${videoName}.mp4"`);
    ytdl(url, {
        quality: "highest",
        format: "mp4",
    }).pipe(res);
});

// Aplicar middleware de autenticación a las rutas protegidas
router.use(['/info', '/mp3', '/mp4'], authenticateToken, protectedRouter);

// Configurar la ruta base para Netlify Functions
app.use('/.netlify/functions/server', router);

// Exportar el handler para Netlify
export const handler = serverless(app);