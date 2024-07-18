import express from "express"
import cors from "cors"

import { getUsers, signup, login, logout } from "./controllers/users-controllers.mjs"
import { getIngredients } from "./controllers/ingredients-controllers.mjs"
import { updateFoodPref, updateBlacklist, updateFavoriteRecipes } from "./controllers/preferences-controller.mjs"
import { authorize } from "./utils/authHelpers.mjs"
import { passport } from "./passport.mjs"
import { generateRecipe } from "./controllers/ai-request-controller.mjs"

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(cors())
app.use(passport.initialize())
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

//users routes
app.get("/api/users", getUsers)
app.post("/api/users/signup", signup)
app.post("/api/users/login", login)
app.post("/api/users/logout", authorize, logout)

//ingredients routes
app.get("/api/ingredients", getIngredients)

//preferences routes
app.post("/api/preferences/set-preferences", updateFoodPref)
app.post("/api/preferences/set-blacklisted-ingredients", updateBlacklist)
app.post("/api/preferences/set-favorited-recipes", updateFavoriteRecipes)

//ai request route
app.post("/api/generate-recipes", generateRecipe)

app.use((err, res, next) => {
    if (err) {
        res.status(err.statusCode || 500).json({ msg: err.statusMessage || "Internal Server Error" })
    } else {
        next()
    }
})

app.listen(3000, () => {
    console.log(`Server running at http://localhost:${port}`)
})
