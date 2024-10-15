import express from "express"
import cors from "cors"
import bodyParser from "body-parser"

import { authorize } from "./utils/authHelpers.mjs"
import { passport } from "./passport.mjs"
import compression from "compression"

import { getIngredients } from "./controllers/ingredients-controllers.mjs"
import { generateRecipe } from "./controllers/ai-request-controller.mjs"

import {
    getUser,
    signup,
    login,
    logout,
    changePassword,
    updateUserData,
    verifyToken,
    verifyEmail,
    resetPassword,
    createSecureLink
} from "./controllers/users-controllers.mjs"

import {
    getFoodPref,
    updateFoodPref,
    getBlacklist,
    updateBlacklist,
    getFavorites,
    getHistory,
    updateUserRecipes
} from "./controllers/preferences-controller.mjs"

const app = express()
const port = process.env.PORT || 3000

app.use(
    cors({
        origin: "http://localhost:5173", // Permette solo questa origine
        methods: ["GET", "POST", "PUT", "DELETE"], // Permette solo questi metodi
        allowedHeaders: ["Content-Type", "Authorization"], // Permette solo questi headers
    })
)
app.use(express.json({ limit: "10mb" })) // Configura il limite per JSON
app.use(passport.initialize())
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(bodyParser.json({ limit: "10mb" }))
app.use(compression({ threshold: 1000 }))

//users routes
app.get("/api/users/get-user/:userId", getUser)

app.post("/api/users/verify-email", authorize, verifyEmail)
app.post("/api/users/create-secure-link", createSecureLink)
app.post("/api/users/reset-password", authorize, resetPassword)

app.post("/api/users/verify-token", verifyToken)
app.post("/api/users/signup", signup)
app.post("/api/users/login", login)
app.post("/api/users/logout", authorize, logout)
app.post("/api/users/change-password", authorize, changePassword)
app.post("/api/users/change-user-data", authorize, updateUserData)

//ingredients routes
app.get("/api/ingredients/get-ingredients", getIngredients)

//preferences routes
app.get("/api/preferences/get-preferences/:userId", getFoodPref)
app.post("/api/preferences/set-preferences", updateFoodPref)

app.get("/api/preferences/get-blacklisted-ingredients/:userId", getBlacklist)
app.post("/api/preferences/set-blacklisted-ingredients", updateBlacklist)

app.get("/api/preferences/get-favorited-recipes/:userId", getFavorites)
app.get("/api/preferences/get-recipes-history/:userId", getHistory)

app.post("/api/preferences/update-user-recipes", updateUserRecipes)

// app.post("/api/preferences/set-favorited-recipes", updateUserRecipes)
// app.post("/api/preferences/update-recipes-history", updateUserRecipes)

//ai request route
app.post("/api/generate-recipes", generateRecipe)

// app.use((err, res, next) => {
//     if (err) {
//         console.log(err)
//         res.status(err.statusCode || 500).json({ msg: err.statusMessage || "Internal Server Error" })
//     } else {
//         next()
//     }
// })

app.listen(3000, () => {
    console.log(`Server running at http://localhost:${port}`)
})
