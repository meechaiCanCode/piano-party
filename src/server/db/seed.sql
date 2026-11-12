INSERT INTO Users (username, password_hash, is_admin, ban_expires) VALUES
    ('TheNoobyApple', '$2b$12$u.p402hsakNToNV5X98zIu7OrQbC6vk2JgFTvkBq9kjI/vxp7/DGi', TRUE, NULL), -- Password: securepass
    ('john', '$2b$12$UOq2gMWrg1lj5woLBf36XudMeiyKd8eLppEPhGmTtu6BJBmclCwPS', FALSE, NULL), -- Password: jdlover
    ('Jaefae', '$2b$12$B3xv.YuOFx8dTiDQckaOUueXBv.oGl0ekWfgIn38Oke6pXl4cMDTm', TRUE, NULL), -- Password: supersecret
    ('MrBanned', '$2b$12$B3xv.YuOFx8dTiDQckaOUueXBv.oGl0ekWfgIn38Oke6pXl4cMDTm', FALSE, '9999-12-31T00:00:00Z'), -- Password: supersecret
    ('MrSoonUnbanned', '$2b$12$B3xv.YuOFx8dTiDQckaOUueXBv.oGl0ekWfgIn38Oke6pXl4cMDTm', FALSE, '3000-12-31T00:00:00Z'); -- Password: supersecret
