## Pointrel20141201 by Paul Fernhout
Pointrel system for Node.js storing data in JSON file envelopes

This is a version of the Pointrel system developed in Node.js.
It stores data in JSON files which have an "envelope" part with
and ID, tags, and other metadata like author, timestamp, and content type,
and a data part with the actual content. It reads these data files
at startup and creates indexes for them in memory.
It supports serving web pages as well as retrieving resources using these indexes.

This version of the Pointrel system was created for use by the NarraCoach/PNIWorkbook/NarraKit
software intended to accompany Cynthia Kurtz's Working With Stories book.
It is being developed in conjunction with that software, so sometimes
several changes are being merged back from that project as one bigger commit into this project.

The intent here is not to support a huge amount of data.
The emphasis is more on data-storage-and-retrieval software that is easy to install and maintain.
