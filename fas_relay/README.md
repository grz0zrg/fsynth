# Fragment Audio Server relay

This application allow to serve multiple Fragment Audio Server over the wire by splitting and distributing the incoming pixels data.

It allow to distribute the sound synthesis computation over different computers or cores.

See "simulation.htm" for the algorithm playground with a nice simulation of servers load.

Allow to specify the distribution weight (aka load) for each servers via the -w option.
Note: the distribution "weight" is a float which indicate "server performance", 1 is the default weight :
* a high weight value for a server (say 2 while all others are 1) mean that the server is slower and will take half load,
* a low value for a server (say 0.5) mean that the server is fast and will take double load

Listen (websocket) on 127.0.0.1:3003 then split the incoming data and distribute it to a multitude of Fragment Audio Server which listen on port starting from 3004
The load output / latency infos from all the connected Fragment Audio Server incoming data is also printed at regular interval

Usage:

* Simple usage (same machine, will try to connect to 127.0.0.1:3004, 127.0.0.1:3005 etc) :
    * `node fas_relay -c 2`

* Usage by specifying address/port of each sound server :
    * `node fas_relay -s="127.0.0.1:3004 127.0.0.1:3005"`
* Usage by specifying address/port + distribution weight of each sound server :
    * `node fas_relay -w="1 1.5" -s="127.0.0.1:3004 127.0.0.1:3005"`
* Usage by specifying a starting address/port and the number of sound server instances on each address + address range :
    * `node fas_relay -r 8 -c 4 -s="192.168.0.40:3003"`
        * Note : this will connect from 192.168.0.40 to 192.168.0.48 on ports 3003 to 3006 for each address

All options can be used with each other, weight option apply to each ip:port of the servers list even with ip/port range (in this case the range weight is the one of the starting addr/port).

Note : All instruments which use inputs are sent to all instances, this is a limitation which can affect performances when alot of instruments use inputs.