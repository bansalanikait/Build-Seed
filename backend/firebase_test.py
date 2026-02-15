import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")  # change if name differs
firebase_admin.initialize_app(cred)

db = firestore.client()

doc_ref = db.collection("test").document("ping")
doc_ref.set({"status": "connected"})

print("🔥 Firebase connected successfully!")
