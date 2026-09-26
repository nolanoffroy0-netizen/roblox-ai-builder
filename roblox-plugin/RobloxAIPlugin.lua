--[[
    Plugin Roblox Studio - Roblox AI Builder
    ------------------------------------------
    A placer dans le dossier des plugins Roblox Studio :
    - Windows : %LOCALAPPDATA%\Roblox\Plugins
    - Mac     : ~/Documents/Roblox/Plugins

    Ce plugin :
    1. Interroge regulierement ton site (GET /api/commands) pour voir s'il y a
       une nouvelle commande a executer.
    2. Cree/modifie le script Luau demande dans le jeu ouvert dans Studio.
    3. Renvoie le resultat (succes/erreur + un resume du contenu du jeu) vers
       ton site (POST /api/status).

    IMPORTANT :
    - Il faut activer "Allow HTTP Requests" dans
      Game Settings > Security, pour que HttpService fonctionne.
    - Remplace SITE_URL et SITE_SECRET ci-dessous par les tiens.
]]

local HttpService = game:GetService("HttpService")

local SITE_URL = "https://TON-SITE.vercel.app" -- <-- a remplacer
local SITE_SECRET = "change-moi-en-un-secret-long-et-aleatoire" -- <-- doit matcher .env sur Vercel
local POLL_INTERVAL = 5 -- secondes

local toolbar = plugin:CreateToolbar("Roblox AI Builder")
local button = toolbar:CreateButton(
    "AI Builder",
    "Active/desactive la connexion au site",
    "rbxassetid://0"
)
button:SetActive(false)

local running = false

local function sendStatus(commandId, success, message, gameContent)
    local payload = HttpService:JSONEncode({
        command_id = commandId,
        success = success,
        message = message,
        game_content = gameContent,
    })

    local ok, err = pcall(function()
        HttpService:RequestAsync({
            Url = SITE_URL .. "/api/status",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-site-secret"] = SITE_SECRET,
            },
            Body = payload,
        })
    end)

    if not ok then
        warn("[AI Builder] Echec envoi du statut :", err)
    end
end

-- Resout un chemin type "ServerScriptService/Dossier/Nom" en (parent, nom)
local function resolveParent(path)
    local parts = string.split(path, "/")
    local name = table.remove(parts, #parts)
    local current = game

    for _, part in ipairs(parts) do
        local child = current:FindFirstChild(part)
        if not child then
            child = Instance.new("Folder")
            child.Name = part
            child.Parent = current
        end
        current = child
    end

    return current, name
end

local function executeCommand(command)
    local ok, err = pcall(function()
        local parent, name = resolveParent(command.instance_path)

        -- Supprime l'ancien script du meme nom s'il existe, pour le remplacer
        local existing = parent:FindFirstChild(name)
        if existing then
            existing:Destroy()
        end

        local scriptInstance = Instance.new(command.script_type or "Script")
        scriptInstance.Name = name
        scriptInstance.Source = command.code
        scriptInstance.Parent = parent
    end)

    if ok then
        local summary = {
            instance_path = command.instance_path,
            script_type = command.script_type,
            explication = command.explication,
        }
        sendStatus(command.id, true, "Script cree/mis a jour avec succes.", summary)
    else
        sendStatus(command.id, false, "Erreur lors de la creation du script : " .. tostring(err), nil)
    end
end

local function pollLoop()
    while running do
        local ok, result = pcall(function()
            return HttpService:RequestAsync({
                Url = SITE_URL .. "/api/commands",
                Method = "GET",
                Headers = {
                    ["x-site-secret"] = SITE_SECRET,
                },
            })
        end)

        if ok and result.Success and result.StatusCode == 200 then
            local decodeOk, command = pcall(function()
                return HttpService:JSONDecode(result.Body)
            end)

            if decodeOk and command then
                executeCommand(command)
            end
        elseif ok and result.StatusCode ~= 204 then
            warn("[AI Builder] Reponse inattendue du site :", result.StatusCode)
        end

        task.wait(POLL_INTERVAL)
    end
end

button.Click:Connect(function()
    running = not running
    button:SetActive(running)

    if running then
        task.spawn(pollLoop)
    end
end)
