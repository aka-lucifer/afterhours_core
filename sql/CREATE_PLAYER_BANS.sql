CREATE TABLE IF NOT EXISTS `player_bans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `hardware_id` varchar(255) CHARACTER SET latin1 NOT NULL,
  `reason` longtext NOT NULL,
  `ban_state` int(11) NOT NULL DEFAULT '0',
  `issued_by` int(11) NOT NULL,
  `issued_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `issued_until` varchar(25) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `issued_by` (`issued_by`),
  FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`issued_by`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;