import passport from "passport"

const authorize = (req, res, next) => {
    passport.authenticate("jwt", { session: false }, (err, user) => {
        user = req.body
        if (!user || err) {
            console.log("error:", err, "user:", user);
            res.status(400).json({ msg: "Unauthorized" })
        } else {
            req.user = user
            next()
        }
    })(req, res, next)
}

export { authorize }