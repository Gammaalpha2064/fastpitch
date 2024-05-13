from flask import Flask, Response, render_template, request,session,redirect,url_for,request,jsonify,send_from_directory,send_file,jsonify
from flask import send_file, session, flash
from concurrent.futures import ThreadPoolExecutor
from google.cloud import storage, pubsub_v1
from werkzeug.utils import secure_filename
import io
import tempfile
import os
import json
import psycopg2
from psycopg2.extras import execute_values
from pgvector.psycopg2 import register_vector
from slide_test import *
from pptgenerate import *
import atexit
from io import BytesIO
import shutil,os
import pandas as pd
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_url_path='/static', static_folder='static', template_folder='templates')
app.config['MAX_CONTENT_PATH'] = 16 * 1024 * 1024  # 16MB limit
TEMPDIR = os.path.join(app.root_path, 'temp')
app.secret_key = "yoursecretkeyhere"

# Initialize Google Cloud Storage and Pub/Sub clients
storage_client = storage.Client()
bucket = storage_client.bucket("userstemplates")
filesbucket = storage_client.bucket("usersfilestorage")
pubsub_publisher = pubsub_v1.PublisherClient()
project_id = 'velvety-accord-422804-u4'  # Your Google Cloud project ID
topic_id = 'UsersFiles'    # The Pub/Sub topic ID
topic_name = "projects/velvety-accord-422804-u4/topics/UsersFiles"
rag_topic_id="rag"

cloud_run_service_url = os.environ.get('CLOUD_RUN_SERVICE_URL', 'https://gcp-pptx-images-7e4kljk7ka-uc.a.run.app')
# Set up database connection
def connect_db():
    conn = psycopg2.connect("user=postgres.yaynqxdhhbabfghvcvmg password=kkCFu9SnzfqxVuiP host=aws-0-eu-central-1.pooler.supabase.com port=6543 dbname=postgres")
    register_vector(conn)
    return conn



@app.route('/login', methods=['GET', 'POST'])
def login():
    msg = ''
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn=connect_db()
        cursor = conn.cursor()

        # Retrieve the user by username
        cursor.execute(f"SELECT id,username,password FROM users WHERE username='{username}' ")
        user = cursor.fetchone()

        if user and check_password_hash(user[2], password):
            session['user_id'] = user[0]
            conn.close()
            return redirect(url_for("hello"))
        else:
            msg = "Invalid username or password."
            conn.close()

    return render_template('home/login.html', msg=msg)



@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('hello'))




def create_temp_dir():
    if 'temp_dir' not in session:
        temp_dir = tempfile.mkdtemp(dir=os.getcwd()+"/temp")
        relative_path = os.path.relpath(temp_dir, start=os.getcwd())
        session['temp_dir'] = relative_path  # Store the temp directory path in the session
    return "Temporary directory created."

@app.route('/trigger_answers',methods=['POST','GET'])
def trigger_answers():
    username = 'user1'
    conn=connect_db()
    cur=conn.cursor()
    cur.execute("TRUNCATE table answers")
    conn.commit()
    

    # After processing files, send a 'trigger check' message
    cur.execute("""SELECT question, otype, section, sectionorder,example
                       FROM public.baserules;""")
    messages = cur.fetchall()
    topic_path = pubsub_publisher.topic_path(project_id, rag_topic_id)
    for message in messages:
        question, otype, section, sectionorder,example = message
        obj=json.dumps({
            "question":question,
            "example":str(example),
            "otype":otype,
            "section":section,
            "sectionorder":sectionorder,
            "username":"user1"
            })
        data=obj.encode('utf-8')
        try:
            future=pubsub_publisher.publish(topic_path, data)
            # print(future)
        except Exception as e:
            print(e)

    conn.close()
    session['msg']="Generating insights you can find the updates as soon as you refresh the page"
    return redirect(url_for('hello'))



@app.route('/')
def hello():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    conn=connect_db()
    cur=conn.cursor()


    cur.execute("""SELECT COUNT(*) as count
                    FROM public.embeddings
                    WHERE username = 'user1'
                      AND date_created > NOW() - INTERVAL '1 minute';""")
    res=cur.fetchone()

    cur.execute("""SELECT COUNT(*) as count
                    FROM public.answers
                    WHERE username = 'user1'; """)
    res2=cur.fetchone()
    print(res[0],res2[0])

    if session.get('msg', None):
        msg=session.get('msg')
        session.pop('msg')
        sections= {"":[{"order":1,"responses": [msg]}]}
    elif res2[0]==0 and res[0]==0:
        msg="""<p style="text-align:center; font-szie:xx-large;"><b>We have processed all your documents. Please click here to <a href="/trigger_answers">Generate Insights</a></b></p>"""
        sections= {"":[{"order":1,"responses": [msg]}]}
    elif  (res[0]>0):
        msg="""<p style="text-align:center; font-szie:xx-large;"><b>We are still processing the documents. Please check back after some time</b></p>"""
        sections= {"":[{"order":1,"responses": [msg]}]}
    else:
        cur.execute("""SELECT section, sectionorder, array_agg(response ORDER BY id) as responses
            FROM public.answers
            WHERE response  NOT LIKE '%No answer%'
            GROUP BY section, sectionorder
            ORDER BY sectionorder;
            """)
        data = cur.fetchall()

        # Close the connection
        cur.close()
        conn.close()

        # Preparing data for the template
        sections = {}
        for section, order, responses in data:
            if section not in sections:
                sections[section] = []
            sections[section].append({
                'order': order,
                'responses': responses
            })



    return render_template('home/index.html', sections=sections,files=show_content())




@app.route('/background_image/<image_key>')
def serve_image(image_key):
    # Check if the user is authenticated, if not, deny access
    if 'user_id' not in session:
        return abort(401, 'Authentication required')

    # Retrieve the image from Google Cloud Storage
    try:
        blob = bucket.blob("images/" + image_key)
        image_data = blob.download_as_bytes()
    except Exception as e:
        # Handle error (e.g., image not found)
        return str(e), 404

    # Serve the image to the client
    return send_file(
        io.BytesIO(image_data),
        mimetype='image/jpeg'  # Adjust the mimetype as needed
    )




def invoke_cloud_function(payload_json):
    headers = {'Content-Type': 'application/json'}
    try:
        # Convert payload to JSON string
        payload_json = json.dumps(payload_json)

        # Send POST request to the Cloud Run service
        try:
            response = requests.post(cloud_run_service_url, headers=headers, data=payload_json)
            response.raise_for_status()  # Raises an HTTPError for bad responses
        except requests.exceptions.RequestException as e:
            print("Error",e)

        # Check if the response is successful
        if response.status_code == 200:
            return jsonify({'message': 'Cloud Run function invoked successfully', 'response': response.json()})
        else:
            return jsonify({'error': 'Failed to invoke Cloud Run service', 'status_code': response.status_code}), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500






def show_content():
    # Assuming the GCS directory path is stored in the session
    gcs_prefix = 'slides/'

    # List all files in the specified GCS directory
    blobs = bucket.list_blobs(prefix=gcs_prefix)
    files_contents = []

    for blob in blobs:
        # Download the file content directly into memory
        file_content = blob.download_as_string().decode('utf-8')
        files_contents.append(file_content)

    return files_contents






@app.route('/updated')
def updated():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    files=show_content()
    return render_template('home/index.html', files=files)




@app.route('/generate_presentation', methods=['POST'])
def generate_presentation():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    if not request.is_json:
        return 'Request must contain JSON data', 400

    json_data = request.json

    # Attempt to retrieve and process the PowerPoint template from GCS
    try:
        blob = bucket.blob('cleantemplate.pptx')
        tppt_data = blob.download_as_bytes()
        tppt = BytesIO(tppt_data)  # Create a BytesIO object from the downloaded bytes

        file_stream = BytesIO()
        presentation_file = create_presentation_from_json(json_data, tppt)
        presentation_file.save(file_stream)
        file_stream.seek(0)

    except Exception as e:
        print("Exception:", e)
        return jsonify({'error': str(e)}), 500

    # Return the PowerPoint presentation as a file download
    return send_file(file_stream, as_attachment=True, download_name='presentation.pptx')



@app.route('/set_dimensions', methods=['POST'])
def set_dimensions():
    data = request.json
    session['width'] = data['width']
    session['height'] = data['height']
    return "Dimensions set in session", 200





@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        # Create temporary directory
        temp_dir = session.pop('temp_dir', None)
        if temp_dir and os.path.isdir(temp_dir) and 'defaulttemp' not in temp_dir:
            shutil.rmtree(temp_dir)
        temp_dir = tempfile.mkdtemp(dir=TEMPDIR)
        session['temp_dir'] = temp_dir


        # Check for file in the request
        file = request.files.get('file')
        if not file or file.filename == '':
            flash('No file provided!')
            return redirect(request.url)

        # Save the file to the temporary directory
        filename = secure_filename(file.filename)

        temp_file_path = os.path.join(temp_dir, filename)
        file.save(temp_file_path)

        # Upload file to Google Cloud Storage
        blob = bucket.blob(file.filename)
        blob.upload_from_filename(temp_file_path)
        # print("Temp dir",session['temp_dir'])
        print(os.listdir(temp_dir))
        process_result = process_ppts(temp_file_path,temp_dir)

        # Cleanup local temporary file
        shutil.rmtree(temp_dir)

        # Invoke processing via Cloud Function or Cloud Run (need to implement `invoke_cloud_function`)
        payload_json = {
              "input_bucket": "userstemplates",
              "input_path": filename,
              "output_bucket": "userstemplates",
              "output_path": "images/",
              "convert_to": "pdf",
              "num_attempts": 2
            }
        response = invoke_cloud_function(payload_json)

        flash('File uploaded and processing initiated.')
        return redirect(url_for('hello'))
    return render_template('upload.html')




def process_file(file, username):

    if not file:
        return
    file_extension = os.path.splitext(file.filename)[1]
    secure_filename(file.filename)
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
        file.save(temp_file.name)
        temp_file.close()  # Ensure the file is closed before uploading
        blob = filesbucket.blob(f"{username}/{file.filename}")
        blob.upload_from_filename(temp_file.name)

        # Prepare message for Pub/Sub
        message_json = json.dumps({
            "filepath": f"{username}/{file.filename}",
            "username": username,
            "mtype": "fileprocess"
        })

        try:
            data = message_json.encode('utf-8')
            # Publish message to the Pub/Sub topic
            topic_path = pubsub_publisher.topic_path(project_id, topic_id)
            future=pubsub_publisher.publish(topic_path, data)
            print(future.result())
            # Clean up the temporary file
            os.unlink(temp_file.name)
        except Exception as e:
            print(e)

@app.route('/uploadbulkfiles', methods=['POST'])
def upload_bulk_files():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    uploaded_files = request.files.getlist("files")
    print(uploaded_files)
    username = 'user1'  # Dynamically assign as per your application's context

    conn=connect_db()
    cur=conn.cursor()
    cur.execute("TRUNCATE table embeddings")
    cur.execute("TRUNCATE table widgets")
    conn.commit()
    conn.close()



    # Process files concurrently
    with ThreadPoolExecutor(max_workers=5) as executor:
        executor.map(lambda file: process_file(file, username), uploaded_files)




    msg="""<p style="text-align:center; font-szie:xx-large;"><b>Thank you for uploading the documents. We will now begin processing the documents. Please check back after some time</b></p>"""
    session['msg']=msg

    return redirect(url_for('hello'))




if __name__ == '__main__':
    app.run(debug=True)
