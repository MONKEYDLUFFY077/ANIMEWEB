from flask import Flask
from werkzeug.utils import secure_filename
from flask import request
from flask import render_template
import sqlite3
from flask import session
from flask import redirect
from flask import session, redirect
from flask_mail import Mail, Message
import random
import time
import os
from werkzeug.security import generate_password_hash
from werkzeug.security import check_password_hash
import re
app = Flask(__name__)

app.secret_key = "animeflix_secret_key"
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'luffy2652006@gmail.com'
app.config['MAIL_PASSWORD'] = 'uirf muzg vdnq ttqw'

mail = Mail(app)
UPLOAD_FOLDER = "static/uploads"

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
def init_db():

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    email TEXT UNIQUE NOT NULL,

    password TEXT NOT NULL,

    profile_pic TEXT DEFAULT '',

    reset_otp TEXT DEFAULT '',

    otp_expiry INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
    """)

    cursor.execute("""
CREATE TABLE IF NOT EXISTS favorites (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    anime_title TEXT NOT NULL,

    anime_image TEXT NOT NULL,

    anime_link TEXT NOT NULL,

    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
    """)

    cursor.execute("""
CREATE TABLE IF NOT EXISTS watchlist (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    anime_title TEXT NOT NULL,

    anime_image TEXT NOT NULL,

    anime_link TEXT NOT NULL,

    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
    """)
    cursor.execute("""
CREATE TABLE IF NOT EXISTS history (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER NOT NULL,

    anime_title TEXT NOT NULL,

    anime_image TEXT NOT NULL,

    anime_link TEXT NOT NULL,

    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
    conn.commit()

    conn.close()
@app.route("/")
def index():
    return render_template("index.html",name = "Flask")
@app.route("/home")
def home():

    if "user_id" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT name, email, profile_pic
        FROM users
        WHERE id=?
        """,
        (session["user_id"],)
    )

    user = cursor.fetchone()

    conn.close()

    user_data = {
        "name": user[0],
        "email": user[1],
        "profile_pic": user[2]
    }

    return render_template(
        "home.html",
        user=user_data
    )
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        identifier = request.form.get("identifier", "").strip().lower()

        password = request.form.get("password", "")

        if not identifier or not password:

            return render_template(
                "login.html",
                error="All fields are required"
            )

        conn = sqlite3.connect("database.db")

        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT *
            FROM users
            WHERE lower(email)=?
            OR lower(name)=?
            """,
            (identifier, identifier)
        )

        user = cursor.fetchone()

        conn.close()

        if user and check_password_hash(user[3], password):

            session["user_id"] = user[0]

            return redirect("/home")

        return render_template(
            "login.html",
            error="Invalid login credentials"
        )

    return render_template("login.html")
@app.route("/logout")
def logout():

    session.clear()

    return redirect("/login")
@app.route("/forgot", methods=["GET", "POST"])
def forgot():

    if request.method == "POST":

        email = request.form.get("email", "").strip().lower()

        if not email:

            return render_template(
                "forgot.html",
                error="Email is required"
            )

        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM users WHERE email=?",
            (email,)
        )

        user = cursor.fetchone()
        print("EMAIL:", email)
        print("USER:", user)

        if not user:
            conn.close()

            return render_template(
                "forgot.html",
                error="No account found with this email"
            )

        otp = str(random.randint(100000, 999999))

        expiry = int(time.time()) + 300

        cursor.execute(
            """
            UPDATE users
            SET reset_otp=?, otp_expiry=?
            WHERE email=?
            """,
            (otp, expiry, email)
        )

        conn.commit()
        conn.close()

        session["reset_email"] = email

        msg = Message(
            'AnimeFlix Password Reset OTP',
            sender=app.config['MAIL_USERNAME'],
            recipients=[email]
        )

        msg.body = f"""
Your AnimeFlix OTP is: {otp}

This OTP expires in 5 minutes.
"""

        mail.send(msg)

        return redirect("/otp")

    return render_template("forgot.html")
@app.route("/gallery")
def gallery():

    if "user_id" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    # user info
    cursor.execute(
        """
        SELECT name, email, profile_pic
        FROM users
        WHERE id=?
        """,
        (session["user_id"],)
    )

    user = cursor.fetchone()

    user_data = {
        "name": user[0],
        "email": user[1],
        "profile_pic": user[2]
    }

    # favorites
    cursor.execute(
        """
        SELECT anime_title
        FROM favorites
        WHERE user_id=?
        """,
        (session["user_id"],)
    )

    favorites = [
        row[0]
        for row in cursor.fetchall()
    ]

    conn.close()

    return render_template(
        "gallery.html",
        user=user_data,
        favorites=favorites
    )
@app.route("/dashboard")
def dashboard():

    if "user_id" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    # user info
    cursor.execute(
        """
        SELECT name, email, profile_pic
        FROM users
        WHERE id=?
        """,
        (session["user_id"],)
    )

    user = cursor.fetchone()

    # favorites
    cursor.execute(
        """
        SELECT id,
            anime_title,
            anime_image,
            anime_link
        FROM favorites
        WHERE user_id=?
        ORDER BY added_at DESC
        """,
        (session["user_id"],)
    )

    favorites = cursor.fetchall()

    cursor.execute(
        """
        SELECT id,
            anime_title,
            anime_image,
            anime_link
        FROM watchlist
        WHERE user_id=?
        ORDER BY added_at DESC
        """,
        (session["user_id"],)
    )

    watchlist = cursor.fetchall()

    cursor.execute(
            """
        SELECT id,
            anime_title,
            anime_image,
            anime_link
        FROM history
        WHERE user_id=?
        ORDER BY watched_at DESC
        LIMIT 12
        """,
        (session["user_id"],)
    )

    history = cursor.fetchall()

    conn.close()

    

    user_data = {
        "name": user[0],
        "email": user[1],
        "profile_pic": user[2]
    }

    return render_template(
        "dashboard.html",
        user=user_data,
        favorites=favorites,
        watchlist=watchlist,
        history=history
    )
@app.route("/toggle-favorite", methods=["POST"])
def toggle_favorite():

    if "user_id" not in session:
        return redirect("/login")

    title = request.form.get("title")
    image = request.form.get("image")
    link = request.form.get("link")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM favorites
        WHERE user_id=?
        AND anime_title=?
        """,
        (session["user_id"], title)
    )

    exists = cursor.fetchone()

    if exists:

        cursor.execute(
            """
            DELETE FROM favorites
            WHERE id=?
            """,
            (exists[0],)
        )

    else:

        cursor.execute(
            """
            INSERT INTO favorites(
                user_id,
                anime_title,
                anime_image,
                anime_link
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                session["user_id"],
                title,
                image,
                link
            )
        )

    conn.commit()

    conn.close()

    return redirect("/gallery")
@app.route("/remove-favorite", methods=["POST"])
def remove_favorite():

    if "user_id" not in session:
        return redirect("/login")

    favorite_id = request.form.get("favorite_id")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM favorites
        WHERE id=?
        AND user_id=?
        """,
        (
            favorite_id,
            session["user_id"]
        )
    )

    conn.commit()

    conn.close()

    return redirect("/dashboard")
@app.route("/add-watchlist", methods=["POST"])
def add_watchlist():

    if "user_id" not in session:
        return redirect("/login")

    title = request.form.get("title")
    image = request.form.get("image")
    link = request.form.get("link")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM watchlist
        WHERE user_id=?
        AND anime_title=?
        """,
        (session["user_id"], title)
    )

    exists = cursor.fetchone()

    if not exists:

        cursor.execute(
            """
            INSERT INTO watchlist(
                user_id,
                anime_title,
                anime_image,
                anime_link
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                session["user_id"],
                title,
                image,
                link
            )
        )

        conn.commit()

    conn.close()

    return redirect("/gallery")
@app.route("/remove-watchlist", methods=["POST"])
def remove_watchlist():

    if "user_id" not in session:
        return redirect("/login")

    watchlist_id = request.form.get("watchlist_id")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute(
        """
        DELETE FROM watchlist
        WHERE id=?
        AND user_id=?
        """,
        (
            watchlist_id,
            session["user_id"]
        )
    )

    conn.commit()

    conn.close()

    return redirect("/dashboard")
@app.route("/add-history", methods=["POST"])
def add_history():

    if "user_id" not in session:
        return redirect("/login")

    title = request.form.get("title")
    image = request.form.get("image")
    link = request.form.get("link")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    # remove old duplicate
    cursor.execute(
        """
        DELETE FROM history
        WHERE user_id=?
        AND anime_title=?
        """,
        (session["user_id"], title)
    )

    # add latest history
    cursor.execute(
        """
        INSERT INTO history(
            user_id,
            anime_title,
            anime_image,
            anime_link
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            session["user_id"],
            title,
            image,
            link
        )
    )

    conn.commit()

    conn.close()

    return redirect(link)
@app.route("/otp", methods=["GET", "POST"])
def otp():

    if request.method == "POST":

        code = request.form.get("otp", "").strip()

        email = session.get("reset_email")

        if not email:
            return redirect("/forgot")

        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT reset_otp, otp_expiry
            FROM users
            WHERE email=?
            """,
            (email,)
        )

        user = cursor.fetchone()

        conn.close()

        if not user:
            return redirect("/forgot")

        saved_otp = user[0]
        expiry = user[1]

        if int(time.time()) > expiry:
            return render_template(
                "otp.html",
                error="OTP expired"
            )

        if code != saved_otp:
            return render_template(
                "otp.html",
                error="Invalid OTP"
            )

        session["otp_verified"] = True

        return redirect("/reset")

    return render_template("otp.html")
@app.route("/player")
def player():
    return render_template("player.html")
@app.route("/profile")
def profile():

    if "user_id" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute(
    """
    SELECT name, email, profile_pic, created_at
    FROM users
    WHERE id=?
    """,
    (session["user_id"],)
)

    user = cursor.fetchone()

    conn.close()

    if not user:
        return redirect("/login")

    user_data = {
    "name": user[0],
    "email": user[1],
    "profile_pic": user[2],
    "created_at": user[3]
}

    error = session.pop("profile_error", None)

    return render_template(
        "profile.html",
        user=user_data,
        error=error
    )
@app.route("/update-profile", methods=["POST"])
def update_profile():

    if "user_id" not in session:
        return redirect("/login")

    name = request.form.get("name", "").strip()

    email = request.form.get("email", "").strip().lower()

    # =========================
    # VALIDATION
    # =========================

    if len(name) < 3:

        session["profile_error"] = \
            "Name must contain at least 3 characters"

        return redirect("/profile")

    email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'

    if not re.match(email_regex, email):

        session["profile_error"] = \
            "Invalid email address"

        return redirect("/profile")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    # check duplicate email

    cursor.execute(
        """
        SELECT id
        FROM users
        WHERE email=?
        AND id != ?
        """,
        (email, session["user_id"])
    )

    if cursor.fetchone():

        conn.close()

        session["profile_error"] = \
            "Email already in use"

        return redirect("/profile")

    cursor.execute(
        """
        UPDATE users
        SET name=?, email=?
        WHERE id=?
        """,
        (name, email, session["user_id"])
    )

    conn.commit()

    conn.close()

    return redirect("/profile")
@app.route("/change-password", methods=["POST"])
def change_password():

    if "user_id" not in session:
        return redirect("/login")

    old_password = request.form.get("old_password", "")

    new_password = request.form.get("new_password", "")
    if len(new_password) < 6:

        return redirect("/profile")

    if not re.search(r"[A-Z]", new_password):

        return redirect("/profile")

    if not re.search(r"[0-9]", new_password):

        return redirect("/profile")
    hashed_password = generate_password_hash(new_password)

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT password
        FROM users
        WHERE id=?
        """,
        (session["user_id"],)
    )

    user = cursor.fetchone()

    if not user:

        conn.close()

        session["profile_error"] = \
            "User not found"

        return redirect("/profile")

    saved_password = user[0]

    if not check_password_hash(
        saved_password,
        old_password
    ):

        conn.close()

        session["profile_error"] = \
            "Old password is incorrect"

        return redirect("/profile")

    cursor.execute(
    "UPDATE users SET password=? WHERE id=?",
    (hashed_password, session["user_id"])
)

    conn.commit()

    conn.close()

    return redirect("/profile")
@app.route("/delete-account", methods=["POST"])
def delete_account():

    if "user_id" not in session:
        return redirect("/login")

    conn = sqlite3.connect("database.db")

    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM users WHERE id=?",
        (session["user_id"],)
    )

    conn.commit()

    conn.close()

    session.clear()

    return redirect("/signup")
@app.route("/upload-profile-picture", methods=["POST"])
def upload_profile_picture():

    if "user_id" not in session:
        return redirect("/login")

    file = request.files.get("profile_pic")

    if not file:
        return redirect("/profile")

    filename = secure_filename(file.filename)

    filepath = os.path.join(
        app.config["UPLOAD_FOLDER"],
        filename
    )

    file.save(filepath)

    db_path = f"/static/uploads/{filename}"

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE users
        SET profile_pic=?
        WHERE id=?
        """,
        (db_path, session["user_id"])
    )

    conn.commit()
    conn.close()

    return redirect("/profile")
@app.route("/reset", methods=["GET", "POST"])
def reset():

    if not session.get("otp_verified"):
        return redirect("/forgot")

    if request.method == "POST":

        new_password = request.form.get("password", "")

        if len(new_password) < 6:

            return render_template(
                "reset.html",
                error="Password must be at least 6 characters"
            )

        if not re.search(r"[A-Z]", new_password):

            return render_template(
                "reset.html",
                error="Password needs one uppercase letter"
            )

        if not re.search(r"[0-9]", new_password):

            return render_template(
                "reset.html",
                error="Password needs one number"
            )

        hashed_password = generate_password_hash(new_password)

        email = session.get("reset_email")

        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE users
            SET password=?,
                reset_otp='',
                otp_expiry=0
            WHERE email=?
            """,
            (hashed_password, email)
        )

        conn.commit()
        conn.close()

        session.pop("otp_verified", None)
        session.pop("reset_email", None)

        return redirect("/login")

    return render_template("reset.html")
@app.route("/signup", methods=["GET", "POST"])
def signup():

    if request.method == "POST":

        name = request.form.get("name", "").strip()

        email = request.form.get("email", "").strip().lower()

        password = request.form.get("password", "")

        # =========================
        # VALIDATION
        # =========================

        if len(name) < 3:

            return render_template(
                "signup.html",
                error="Name must contain at least 3 characters"
            )

        email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'

        if not re.match(email_regex, email):

            return render_template(
                "signup.html",
                error="Invalid email address"
            )

        if len(password) < 6:

            return render_template(
                "signup.html",
                error="Password must be at least 6 characters"
            )

        if not re.search(r"[A-Z]", password):

            return render_template(
                "signup.html",
                error="Password must contain one uppercase letter"
            )

        if not re.search(r"[0-9]", password):

            return render_template(
                "signup.html",
                error="Password must contain one number"
            )

        conn = sqlite3.connect("database.db")

        cursor = conn.cursor()

        # duplicate email

        cursor.execute(
            "SELECT id FROM users WHERE email=?",
            (email,)
        )

        if cursor.fetchone():

            conn.close()

            return render_template(
                "signup.html",
                error="Email already registered"
            )

        # duplicate username

        cursor.execute(
            "SELECT id FROM users WHERE lower(name)=?",
            (name.lower(),)
        )

        if cursor.fetchone():

            conn.close()

            return render_template(
                "signup.html",
                error="Username already exists"
            )

        hashed_password = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users(name, email, password)
            VALUES (?, ?, ?)
            """,
            (name, email, hashed_password)
        )

        conn.commit()

        conn.close()

        return redirect("/login")

    return render_template("signup.html")
@app.route("/splash")
def splash():
    return render_template("splash.html")
if __name__ == "__main__":
    init_db()
    app.run(debug=True)
