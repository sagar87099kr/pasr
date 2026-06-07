import mongoose from 'mongoose';
mongoose.connect('mongodb://sagar_03:jGpZtSg59Nq6B7PS@ac-kxcg7ut-shard-00-00.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-01.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-02.uo7zpee.mongodb.net:27017/?ssl=true&replicaSet=atlas-tjqeny-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const sample = await db.collection('orders').findOne({});
    console.log(JSON.stringify(sample, null, 2));
    process.exit(0);
  });
