class ExpressError extends Error{
    constructor(statusCode, message){
        super();
        this.statusCode =Number(statusCode);
        this.message = message;
    }
};

module.exports= ExpressError;