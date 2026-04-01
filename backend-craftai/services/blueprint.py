def get_portfolio_blueprint():
    return {
        "index.html": """
<html>
<head>
  <title>{name}</title>
</head>
<body>

<h1>{name}</h1>
<p>{about}</p>

{projects}

<p>{email}</p>

</body>
</html>
""",
        "style.css": "body {{ font-family: Arial; }}",
        "script.js": ""
    }