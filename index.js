const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 3222

// Middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ftqixdj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT =(req,res,next)=>{
    const authorization =req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message:'unauthorize'})
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(error,decoded)=>{
        if(error){
            return res.status(403).send({error:true,message:'unauthorized access'})
        }
        req.decoded=decoded;
        next()
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const serviceCollection = client.db("carDoctor").collection('services');

        const serviceBookCollection = client.db("carDoctor").collection('servicesBooks')


        app.post('/jwt',(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, {
                expiresIn:'1h'

            })
            res.send({token})
        })

        app.get('/services', async(req,res)=>{
            const cursor = serviceCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/services/:id',async(req,res)=>{
            const id = req.params.id;
            const query= {_id: new ObjectId(id)}
            const option = {
                projection: {title:1, price:1,service_id:1,img:1,}
            }
            const result = await serviceCollection.findOne(query,option)
            res.send(result)
        })

        // Services book

        app.get('/servicesBook',verifyJWT, async(req,res)=>{
            const decoded = req.decoded
            console.log('Comeback',decoded.email,req.email)
            if(decoded.email !== req.query.email){
                return res.status(403).send({error: 1, message:'forbidden access'})
            }
            let query = {}
            if(req.query?.email){
                query= {email: req.query.email}
            }

            const result = await serviceBookCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/servicesBook',async(req,res)=>{
            const booking = req.body;
            const result = await serviceBookCollection.insertOne(booking)
            res.send(result)
        })

        app.patch("/servicesBook/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBookings = req.body;
            const updateDoc = {
                $set: {
                   status : updatedBookings.status
                },
            };
            const result = await serviceBookCollection.updateOne(filter,updateDoc);
            res.send(result);

        })

        app.delete('/servicesBook/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await serviceBookCollection.deleteOne(query)
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})