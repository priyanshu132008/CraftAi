import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Connect to Supabase
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"), 
    os.getenv("SUPABASE_ANON_KEY")
)

# Use the credentials you just created in Step 1
email = "test@craftai.com"
password = "test123"

try:
    response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    print("\n✅ LOGIN SUCCESSFUL!")
    print("\nCopy this exact token string below:\n")
    print(response.session.access_token)
    print("\n--------------------------------------------------\n")
except Exception as e:
    print("❌ Error logging in:", e)