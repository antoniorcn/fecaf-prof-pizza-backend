const express = require('express');
const bodyParser = require('body-parser');
const config = require('config');
const pg = require('pg');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || config.get('server.port');
const JWT_SECRET = process.env.JWT_SECRET || config.get('jwt.secret');

const pool = new pg.Pool(
    {
        connectionString: "postgres://meaxfophlbipcd:a96c92ab8e0e95761cc53d1d778e12a6cd19ca1b65a54452264c68937a2186bd@ec2-107-22-83-3.compute-1.amazonaws.com:5432/df1guhaibu1lmd",
        ssl: { 
            rejectUnauthorized: false
        }
    }
);

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.set('port', port);


const filtroJWT = (req, res, next) => { 
    console.log("**** Filtro sendo executado ****");
    const headers = req.headers;
    const authorization = headers.authorization;
    if (authorization && authorization.substring(0, 6) === "Bearer") { 
        // console.log("Authorization inicio ==> ", );
        const token = authorization.substring(7);
        console.log("Authorization==>", headers.authorization);
        console.log("Token==>", token);
        jwt.verify(token, JWT_SECRET, (err, info) => { 
            if (err) { 
                return res.status(403).send("Token invalido");
            }
            console.log("Token Validado")
            console.log("Erro =>", err);
            console.log("Info ==> ", info);
            next();
        });

    } else { 
        return res.status(401).send("Authorization incorreto");
    }
}


app.route('/reset').get(filtroJWT, (req, res) => { 
    let query = "DROP TABLE IF EXISTS pedidos; ";
    query += "CREATE TABLE pedidos (";
    query += " cliente varchar(100), ";
    query += " sabor varchar(50), ";
    query += " quantidade int, ";
    query += " tamanho varchar(25) ";
    query += "); ";
    query = "DROP TABLE IF EXISTS usuarios; ";
    query += "CREATE TABLE usuarios (";
    query += " usuario varchar(50), ";
    query += " senha varchar(255), ";
    query += " perfil varchar(25), ";
    query += " nome varchar(100) ";
    query += "); ";
    query += "INSERT INTO usuarios (usuario, senha, perfil, nome) ";
    query += "VALUES ('antonio', '123456', 'ADMIN', 'Antonio Carvalho');";

    pool.query(query, (err, dbres) => { 
        console.log("Executando reset de banco de dados");
        if (err) { 
            res.status(500).send(err);
        } else { 
            res.status(200).send("Banco de dados resetado");
        }
    })
});


app.route('/pedidos').get(filtroJWT, (req, res)=>{
    let qry = "SELECT * from pedidos;";
    pool.query(qry, (err, dbres) => { 
        if (err) { 
            res.status(500).send(err);
        } else { 
            res.status(200).json(dbres.rows);
        }
    });
});

app.route('/pedido/adicionar').post(filtroJWT, (req, res)=> { 
    let qry = "INSERT INTO pedidos ";
    qry += "(cliente, sabor, quantidade, tamanho) "
    qry += ` VALUES ('${req.body.cliente}', '${req.body.sabor}',`;
    qry += ` ${req.body.quantidade}, '${req.body.tamanho}');`;
    pool.query(qry, (err, dbres) => { 
        if (err) { 
            res.status(500).send(err);
        } else { 
            res.status(200).send("Ok");
        }
    });
})

app.route('/login').post((req, res) => { 
    const user = req.body.usuario;
    const pass = req.body.senha;
    console.log("Testando usuario e senha");
    if (user === undefined || pass === undefined) { 
        return res.status(400).send("Usuário e senha são necessários")
    } else { 
        console.log("Usuario e senhas recebidos");
        console.log("Usuario=>", user, "   Senha=>", pass);

        let qry = `SELECT * FROM usuarios WHERE usuario = '${user}' AND senha = '${pass}';`;
        pool.query(qry, (err, dbres) => { 
            if (err) { 
                res.status(500).send(err);
            } else { 
                if (dbres.rows.length > 0) { 
                    const dbusuario = dbres.rows[0];
                    const payload = {   "usuario": dbusuario.usuario, 
                                        "perfil": dbusuario.perfil,
                                        "nome": dbusuario.nome
                                    }
                    console.log("SECRET==>", JWT_SECRET);
                    const token = jwt.sign(payload, JWT_SECRET);
                    console.log("TOKEN=>", token);
                    const resposta = {
                        "token": token
                    }
                    res.status(200).json(resposta);
                } else {
                    res.status(401).send("Usuario ou senha inválidos");
                }
            }
        });
    }
});

app.listen(port, () => { 
    console.log("Servidor está iniciado na porta ", port);
})