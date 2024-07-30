import express from "express"
import cors from "cors"
import bodyParser from "body-parser"

import { getUsers, signup, login, logout, changePassword, updateAvatar } from "./controllers/users-controllers.mjs"
import { getIngredients } from "./controllers/ingredients-controllers.mjs"
import {
    getFoodPref,
    updateFoodPref,
    getBlacklist,
    updateBlacklist,
    getFavoriteRecipes,
    updateFavoriteRecipes,
    getRecipesHistory,
    updateRecipesHistory,
} from "./controllers/preferences-controller.mjs"
import { authorize } from "./utils/authHelpers.mjs"
import { passport } from "./passport.mjs"
import { generateRecipe } from "./controllers/ai-request-controller.mjs"

const app = express()
const port = process.env.PORT || 3000

app.use(
    cors({
        origin: "http://localhost:5173", // Permette solo questa origine
        methods: ["GET", "POST", "PUT", "DELETE"], // Permette solo questi metodi
        allowedHeaders: ["Content-Type", "Authorization"], // Permette solo questi headers
    })
)
app.use(express.json({ limit: '10mb' })); // Configura il limite per JSON
app.use(passport.initialize())
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(bodyParser.json({ limit: "10mb" }))

//users routes
app.get("/api/users", getUsers)
app.post("/api/users/signup", signup)
app.post("/api/users/login", login)
app.post("/api/users/logout", authorize, logout)
app.post("/api/users/change-password", authorize, changePassword)
app.post("/api/users/change-avatar", updateAvatar)

//ingredients routes
app.get("/api/ingredients/get-ingredients", getIngredients)

//preferences routes
app.get("/api/preferences/get-preferences/:userId", getFoodPref)
app.post("/api/preferences/set-preferences", updateFoodPref)

app.get("/api/preferences/get-blacklisted-ingredients/:userId", getBlacklist)
app.post("/api/preferences/set-blacklisted-ingredients", updateBlacklist)

app.get("/api/preferences/get-favorited-recipes/:userId", getFavoriteRecipes)
app.post("/api/preferences/set-favorited-recipes", updateFavoriteRecipes)

app.get("/api/preferences/get-recipes-history/:userId", getRecipesHistory)
app.post("/api/preferences/update-recipes-history", updateRecipesHistory)

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
