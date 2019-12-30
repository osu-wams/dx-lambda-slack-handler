const Wreck = require("@hapi/wreck");
const zlib = require("zlib");
const pMap = require("p-map");

const slackPayload = function(obj) {
  const payload = {
    attachments: []
  };
  const blocks = [];

  if (typeof obj.data === "string") {
    blocks.push({
      type: "section",
      text: {
        type: "plain_text",
        text: obj.data
      }
    });
  } else {
    if (obj.data.level) {
      obj.level = obj.data.level;
      delete obj.data.level;
    }
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `\`\`\` ${JSON.stringify(obj.data, null, "  ")} \`\`\``
      }
    });
  }
  delete obj.data;

  let color = "";
  let emoji = "";
  if (obj.level.toUpperCase() === "INFO") {
    color = "#d1ecf1";
    emoji = ":eyes:";
  }
  if (obj.level.toUpperCase() === "WARN") {
    color = "#fff3cd";
    emoji = ":warning:";
  }
  if (obj.level.toUpperCase() === "ERROR") {
    color = "#f8d7da";
    emoji = ":fire:";
  }
  if (obj.group) {
    payload.text = `*${emoji} ${obj.level}* - ${obj.group}`;
  }
  delete obj.level;

  const context = [];
  if (obj.timestamp) {
    context.push({
      type: "plain_text",
      text: obj.timestamp
    });
  }
  if (obj.sessionID) {
    context.push({
      type: "plain_text",
      text: `sessionID: ${obj.sessionID}`
    });
  }
  if (context.length !== 0) {
    blocks.push({
      type: "context",
      elements: context
    });
  }
  // set any special channel:
  payload.attachments = [{ blocks, color }];
  return payload;
};

const postToSlack = async function(data) {
  await Wreck.post(process.env.SLACK_HOOK || process.env.SLACK_WEBHOOK, {
    headers: { "Content-type": "application/json" },
    payload: JSON.stringify(data)
  });
};

exports.handler = async function(req) {
  const debug = process.env.SLACK_DEBUG === "on";

  if (debug) {
    console.log(`handling request: ${req}`); //eslint-disable-line no-console
  }

  let event = {};
  if (req.awslogs) {
    const payload = Buffer.from(req.awslogs.data, "base64");
    const result = zlib.gunzipSync(payload);
    event = JSON.parse(result.toString("ascii"));
  } else {
    event = req; //used when testing
  }

  const group = event.logGroup;
  if (event.logEvents) {
    await pMap(event.logEvents, async e => {
      const obj = {
        group
      };
      const { timestamp, sessionID, level, stack, error, message } = JSON.parse(
        e.message
      );
      obj.timestamp = timestamp;
      obj.sessionID = sessionID;
      obj.level = level;
      obj.stack = stack;
      obj.error = error;
      obj.message = message;
      obj.data = {
        timestamp,
        sessionID,
        level,
        message,
        error,
        stack
      };

      const payload = slackPayload(obj);
      // if we can't report the log to slack,
      // send another message to slack notifying of the failure:
      try {
        await postToSlack(payload);
      } catch (e) {
        await postToSlack(
          slackPayload({
            data: {
              message: "dx-lambda-slack-handler Unable to parse log payload",
              data: payload,
              level: "ERROR",
              tags: { error: true }
            }
          })
        );
        console.log(e);
      }
    });
  }

  return {
    body: "ok"
  };
};
