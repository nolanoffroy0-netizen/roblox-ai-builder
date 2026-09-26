--[[
    Plugin Roblox Studio - Roblox AI Builder
    ------------------------------------------
    A placer dans le dossier des plugins Roblox Studio :
    - Windows : %LOCALAPPDATA%\Roblox\Plugins
    - Mac     : ~/Documents/Roblox/Plugins

    Ce plugin :
    1. Interroge regulierement ton site (GET /api/commands) pour voir s'il y a
       une nouvelle commande a executer.
    2. Cree les instances demandees (Part, Model, Script, Sound, etc, avec
       leurs proprietes) dans le jeu ouvert dans Studio.
    3. Renvoie le resultat (succes/erreur + un resume) vers ton site
       (POST /api/status).

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

-- Resout un chemin type "Workspace/Dossier/Nom" en (parent, nom).
-- Cree les dossiers/models intermediaires manquants au passage.
local function resolveParent(path)
    local parts = string.split(path, "/")
    local name = table.remove(parts, #parts)
    local current = game

    for _, part in ipairs(parts) do
        local child = current:FindFirstChild(part)
        if not child then
            local okService, service = pcall(function()
                return game:GetService(part)
            end)
            if okService and service then
                child = service
            else
                child = Instance.new("Folder")
                child.Name = part
                child.Parent = current
            end
        end
        current = child
    end

    return current, name
end

-- Applique une propriete en convertissant les types courants
-- (Vector3, Color3, BrickColor, Material) depuis le JSON recu.
local function applyProperty(instance, propName, value)
    local ok, err = pcall(function()
        if type(value) == "table" and value.x ~= nil and value.y ~= nil and value.z ~= nil then
            instance[propName] = Vector3.new(value.x, value.y, value.z)
        elseif type(value) == "table" and value.r ~= nil and value.g ~= nil and value.b ~= nil then
            instance[propName] = Color3.new(value.r, value.g, value.b)
        elseif propName == "BrickColor" and type(value) == "string" then
            instance.BrickColor = BrickColor.new(value)
        elseif propName == "Material" and type(value) == "string" then
            instance.Material = Enum.Material[value]
        else
            instance[propName] = value
        end
    end)

    if not ok then
        warn("[AI Builder] Impossible d'appliquer la propriete", propName, ":", err)
    end
end

local function createInstance(instDef)
    local parent, name = resolveParent(instDef.path)

    local existing = parent:FindFirstChild(name)
    if existing then
        existing:Destroy()
    end

    local newInstance = Instance.new(instDef.class_name)
    newInstance.Name = name

    if instDef.properties then
        for propName, value in pairs(instDef.properties) do
            applyProperty(newInstance, propName, value)
        end
    end

    newInstance.Parent = parent

    return newInstance
end

local function executeCommand(command)
    local created = {}
    local ok, err = pcall(function()
        for _, instDef in ipairs(command.instances or {}) do
            local inst = createInstance(instDef)
            table.insert(created, inst:GetFullName())
        end
    end)

    if ok then
        sendStatus(command.id, true, "Instances creees avec succes.", { created = created, explication = command.explication })
    else
        sendStatus(command.id, false, "Erreur lors de la creation : " .. tostring(err), { created = created })
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
