from fastapi import FastAPI

from app.database.database import engine

from app.database.database import Base

import app.models.user

Base.metadata.create_all(bind=engine)

app=FastAPI()

@app.get("/")

def root():

    return {"message":"AegisAI Backend Running"}