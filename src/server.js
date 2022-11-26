const express = require("express");
const handlebars = require("express-handlebars");
const {Server} = require("socket.io");
const {ContenedorMysql} = require("./managers/contenedorMysql.js");
const {options} = require("./config/databaseConfig.js")

const app = express();

const products = new ContenedorMysql(options.mariaDB, "productos");
const messages = new ContenedorMysql(options.sqliteDB, "chat");

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"))

const PORT = 8080 || process.env.PORT;

const server = app.listen(PORT, () => console.log(`Servidor inicializado en el puerto ${PORT}`));

//Configurar servidor para indicarle que usaremos motor de plantillas
app.engine("handlebars", handlebars.engine());

//Indicar donde están las vistas
app.set("views", __dirname + "/views");

//Indicar el motor que usaré en express
app.set("view engine", "handlebars");

//Configurar websocket del lado del servidor
const io = new Server(server);

io.on("connection", async (socket) => {
    console.log("Nuevo cliente conectado");

    //Productos
    //Cada vez que socket se conecte le envio los productos
    socket.emit("products", await products.getAll());
    socket.on("newProduct", async (data) => {
        await products.save(data);
        io.sockets.emit("products", await products.getAll())
    });

    //Chat
    //Enviar los mensajes al cliente
    socket.emit("messagesChat", await messages.getAll());
    socket.on("newMsg", async(data)=>{
        await messages.save(data);
        //Enviamos los mensajes a todos los sockets que esten conectados.
        io.sockets.emit("messagesChat", await messages.getAll())
    })
})

//Rutas
app.get("/", async (req, res) => {
    res.render("home", {
        products: products,
        messages: messages
    })
})