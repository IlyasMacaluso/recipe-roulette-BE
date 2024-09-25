import passport from "passport"

const authorize = (req, res, next) => {
    // Estrai il token dall'header o dalla query string
    const token = req.headers["authorization"]?.split(" ")[1] || req.query.token

    // Se non c'è un token, restituisci un errore
    if (!token) {
        return res.status(401).json({ msg: "No token provided, Unauthorized" })
    }

    // Autenticazione con passport
    passport.authenticate("jwt", { session: false }, (err, user) => {
        if (err || !user) {
            console.log("Authorize middleware - error:", err, "user:", user)
            return res.status(401).json({ msg: "Unauthorized" })
        } else {
            console.log("Authorize middleware - user:", user)
            req.user = user // Aggiungi l'utente alla richiesta
            next() // Procedi al prossimo middleware
        }
    })(req, res, next)
}

export { authorize }
