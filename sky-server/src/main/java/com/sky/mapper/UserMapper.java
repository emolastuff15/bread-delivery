package com.sky.mapper;

import com.sky.entity.User;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserMapper {

    /**
     * 根据用户名查询用户
     */
    @Select("select * from user where openid = #{username}")
    User getByUsername(String username);

    /**
     * 根据id查询用户
     */
    @Select("select * from user where id = #{id}")
    User getById(Long id);

    /**
     * 新增用户
     * 注意：必须回填自增主键（useGeneratedKeys），否则注册后 user.getId() 仍为 null，
     * 导致注册接口签发的 JWT 里 userId 是 null，注册完立刻调用需登录接口会一律 401。
     */
    @Insert("insert into user (openid, name, password, phone, sex, id_number, avatar, create_time) " +
            "values (#{username}, #{name}, #{password}, #{phone}, #{sex}, #{idNumber}, #{avatar}, #{createTime})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insert(User user);

    /**
     * 修改密码
     */
    @Update("update user set password = #{password} where id = #{id}")
    void updatePassword(@Param("id") Long id, @Param("password") String password);
}
