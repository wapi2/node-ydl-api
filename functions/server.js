import express from "express";
import serverless from "serverless-http";
import ytdl from "ytdl-core";
import cors from "cors";
import { authenticateToken } from './auth_middleware.js';

const app = express();

// Configuración de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Crear el router
const router = express.Router();

// Aplicar autenticación a las rutas específicas
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
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        const thumbnail = info.videoDetails.thumbnails[2].url;

        res.json({ title, thumbnail });
    } catch (error) {
        console.error('Error in /info:', error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

router.get("/mp3", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getInfo(url);
        const videoName = info.videoDetails.title;

        res.header("Content-Disposition", `attachment; filename="${videoName}.mp3"`);
        res.header("Content-type", "audio/mpeg3");

        ytdl(url, { quality: "highestaudio", format: "mp3" }).pipe(res);
    } catch (error) {
        console.error('Error in /mp3:', error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

router.get("/mp4", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getInfo(url);
        const videoName = info.videoDetails.title;

        res.header("Content-Disposition", `attachment; filename="${videoName}.mp4"`);

        ytdl(url, {
            quality: "highest",
            format: "mp4",
        }).pipe(res);
    } catch (error) {
        console.error('Error in /mp4:', error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// Montar el router en la aplicación
app.use('/.netlify/functions/server', router);
app.use('/api', router); // Ruta alternativa más corta

// Exportar el handler para Netlify Functions
export const handler = serverless(app);