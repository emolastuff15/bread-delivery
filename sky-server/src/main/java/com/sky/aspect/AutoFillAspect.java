package com.sky.aspect;

import com.sky.annotation.AutoFill;
import com.sky.constant.AutoFillConstant;
import com.sky.context.BaseContext;
import com.sky.enumeration.OperationType;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Aspect
@Component
@Slf4j
public class AutoFillAspect {
    @Pointcut("execution(* com.sky.mapper.*.*(..)) && @annotation(com.sky.annotation.AutoFill)")
    public void autoFillPointCut(){}

    @Before("autoFillPointCut()")
    public void autoFill(JoinPoint joinPoint) throws NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        log.info("开始进行公共字段填充");
        MethodSignature signature=(MethodSignature) joinPoint.getSignature();//获取void insert
        AutoFill autoFill=signature.getMethod().getAnnotation(AutoFill.class);// 获取@autofill 的对象
        OperationType operationType=autoFill.value();

        Object[] args=joinPoint.getArgs();
        if(args==null || args.length==0){
            return;
        }
        Object entity=args[0];
        LocalDateTime localDateTime=LocalDateTime.now();
        Long id = BaseContext.getCurrentId();
        if(operationType==OperationType.INSERT){
            Method setCreateTime=entity.getClass().getDeclaredMethod(AutoFillConstant.SET_CREATE_TIME,LocalDateTime.class);
            Method setCreateUser=entity.getClass().getDeclaredMethod(AutoFillConstant.SET_CREATE_USER,Long.class);
            Method setUpdateTime=entity.getClass().getDeclaredMethod(AutoFillConstant.SET_UPDATE_TIME,LocalDateTime.class);
            Method setUpdateUser=entity.getClass().getDeclaredMethod(AutoFillConstant.SET_UPDATE_USER,Long.class);

            setCreateTime.invoke(entity,localDateTime);
            setCreateUser.invoke(entity,id);
            setUpdateTime.invoke(entity,localDateTime);
            setUpdateUser.invoke(entity,id);
        } else if (operationType==OperationType.UPDATE) {

            Method setUpdateTime=entity.getClass().getDeclaredMethod(AutoFillConstant.SET_UPDATE_TIME,LocalDateTime.class);
            Method setUpdateUser=entity.getClass().getDeclaredMethod(AutoFillConstant.SET_UPDATE_USER,Long.class);

            setUpdateTime.invoke(entity,localDateTime);
            setUpdateUser.invoke(entity,id);
        }
    }
}
