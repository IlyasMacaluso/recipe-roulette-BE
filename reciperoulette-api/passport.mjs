import passport from "passport"
import passportJWT from "passport-jwt"
import dotenv from "dotenv"
import { db } from "./utils/DBhelpers.mjs"

dotenv.config()

const secretKey = process.env.SECRET_KEY

if (!secretKey) {
    throw new Error("No KEY variable was found in .env file")
}

const { Strategy, ExtractJwt } = passportJWT

passport.use(
    new Strategy(
        {
            secretOrKey: secretKey,
            jwtFromRequest: (req) => {
                // Estrai il token dall'header o dalla query string
                const tokenFromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req)
                const tokenFromQuery = req.query.token

                return tokenFromHeader || tokenFromQuery
            },
        },
        async (payload, done) => {
            try {
                console.log("JWT Payload:", payload) // Aggiungi questo log
                const user = await db.oneOrNone(`SELECT * FROM users WHERE id=$1`, [payload.id])
                if (user) {
                    return done(null, user)
                } else {
                    return done(null, false, { msg: "User not found" })
                }
            } catch (error) {
                done(error, false)
            }
        }
    )
)

export { passport }
