import passport from "passport"

const authorize = (req, res, next) => {
    passport.authenticate("jwt", { session: false }, (err, user) => {
         if (!user || err) {
            console.log("error:", err, "user:", user);
            res.status(400).json({ msg: "Unauthorized" })
        } else {
            console.log("user:", user);
            req.user = user
            next()
        }
    })(req, res, next)
}

export { authorize }