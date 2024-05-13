from google.cloud import pubsub_v1
import json
# TODO(developer)
project_id = "velvety-accord-422804-u4"
topic_id = "UsersFiles"

publisher = pubsub_v1.PublisherClient()
# The `topic_path` method creates a fully qualified identifier
# in the form `projects/{project_id}/topics/{topic_id}`
topic_path = publisher.topic_path(project_id, topic_id)


data_str = json.dumps({"filepath": "user1/SPGlobal_Computacenterplc_BalanceSheet_26-Feb-2024.xls", "username": "user1","mtype":"fileprocess"})
# Data must be a bytestring
data = data_str.encode("utf-8")
# When you publish a message, the client returns a future.
future = publisher.publish(topic_path, data)
print(future.result())

print(f"Published messages to {topic_path}.")