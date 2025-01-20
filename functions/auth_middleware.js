import config from './config.js';

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        if (token !== config.API_TOKEN) {
            return res.status(403).json({ error: 'Token inválido' });
        }

        next();
    } catch (error) {
        console.error('Error en autenticación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export default authenticateToken;