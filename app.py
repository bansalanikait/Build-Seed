from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "Buildathon server running"

@app.route("/test", methods=["POST"])
def test():
    data = request.json
    return jsonify({
        "message": "Data received",
        "data": data
    })

if __name__ == "__main__":
    app.run(port=5000)
