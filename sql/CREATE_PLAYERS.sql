CREATE TABLE IF NOT EXISTS `players` (
  `player_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `identifier` varchar(255) CHARACTER SET latin1 NOT NULL,
  `hardware_id` varchar(255) CHARACTER SET latin1 NOT NULL,
  `rank` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0',
  `whitelisted` tinyint(1) NOT NULL DEFAULT 0,
  `playtime` int(25) NOT NULL DEFAULT 0,
  `steam_hex` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT "Unknown",
  `xbl` varchar(255) CHARACTER SET latin1 DEFAULT "Unknown",
  `live` varchar(255) CHARACTER SET latin1 DEFAULT "Unknown",
  `discord` varchar(255) CHARACTER SET latin1 DEFAULT "Unknown",
  `fivem` varchar(255) CHARACTER SET latin1 DEFAULT "Unknown",
  `ip` varchar(255) CHARACTER SET latin1 DEFAULT "Unknown",
  `last_connection` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_disconnection` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`player_id`),
  KEY `identifier` (`identifier`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
