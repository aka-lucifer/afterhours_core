CREATE TABLE IF NOT EXISTS `players` (
  `player_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `identifier` varchar(255) CHARACTER SET latin1 NOT NULL,
  `rank` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `steam_hex` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `xbl` varchar(255) CHARACTER SET latin1 NOT NULL,
  `live` varchar(255) CHARACTER SET latin1 NOT NULL,
  `discord` varchar(255) CHARACTER SET latin1 NOT NULL,
  `fivem` varchar(255) CHARACTER SET latin1 NOT NULL,
  `ip` varchar(255) CHARACTER SET latin1 NOT NULL,
  `playtime` int(25) NOT NULL DEFAULT 0,
  `metadata` TEXT NOT NULL,
  `last_connection` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_disconnection` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`player_id`),
  KEY `identifier` (`identifier`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;