{
  "id": "flow_runner",
  "name": "Flow Runner",
  "description": "Background workflow execution manager with job monitoring and control",
  "icon": "fas fa-cogs",
  "keywords": ["workflow", "automation", "jobs", "background", "execution", "monitor"],
  "author": "Sypnex OS",
  "version": "1.0.0",
  "type": "user_app",
  "scripts": ["main.js"],
  "styles": ["style.css"],
  "settings": [{
      "key": "FLOW_RUNNER_API",
      "name": "Flow Runner API",
      "type": "string",
      "value": "http://127.0.0.1:8080",
      "description": "Flow Runner API URL"
    },{
      "key": "SYPNEX_OS_API",
      "name": "Sypnex OS API",
      "type": "string",
      "value": "http://127.0.0.1:5000",
      "description": "Sypnex OS Runner API URL"
    }]
}
